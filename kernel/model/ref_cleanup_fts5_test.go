// SiYuan - https://github.com/siyuan-note/siyuan
// Copyright (c) 2020-present, b3log.org
// SPDX-License-Identifier: AGPL-3.0-or-later

//go:build fts5

package model

import (
	"testing"

	"github.com/88250/lute/ast"
	"github.com/siyuan-note/siyuan/kernel/conf"
	"github.com/siyuan-note/siyuan/kernel/filesys"
	"github.com/siyuan-note/siyuan/kernel/sql"
	"github.com/siyuan-note/siyuan/kernel/treenode"
	"github.com/siyuan-note/siyuan/kernel/util"
)

// TestRemoveDocCleansDanglingRefs 验证删除文档后，其他文档中指向被删块的嵌入与行内引用
// 会被自动清理，且 refs 索引不再残留指向已删块的来源。
func TestRemoveDocCleansDanglingRefs(t *testing.T) {
	fixture := setupStructureTransactionTest(t)
	setupFoldTransactionDatabase(t, fixture)
	Conf.Search.Store(conf.NewSearch())

	refDocID := ast.NewNodeID()
	refTree := treenode.NewTree(fixture.box.ID, "/"+refDocID+".sy", "/Reference", "Reference")
	embed := &ast.Node{Type: ast.NodeBlockQueryEmbed, ID: ast.NewNodeID()}
	embed.AppendChild(&ast.Node{Type: ast.NodeBlockQueryEmbedScript,
		Tokens: []byte("select * from blocks where id='" + fixture.childID + "'")})
	refTree.Root.AppendChild(embed)
	refTree.Root.FirstChild.AppendChild(&ast.Node{Type: ast.NodeTextMark, TextMarkType: "block-ref",
		TextMarkBlockRefID: fixture.childID, TextMarkBlockRefSubtype: "s", TextMarkTextContent: "inline"})
	if err := indexWriteTreeIndexQueue(refTree); err != nil {
		t.Fatal(err)
	}
	sql.FlushQueue()

	if err := RemoveDoc(fixture.box.ID, fixture.sourcePath); err != nil {
		t.Fatalf("remove doc failed: %s", err)
	}
	sql.FlushQueue()

	reloaded, err := filesys.LoadTree(fixture.box.ID, refTree.Path, util.NewLute())
	if err != nil {
		t.Fatalf("reload referencing doc failed: %s", err)
	}
	var dangling int
	treenode.WalkWithInlineTitles(reloaded.Root, func(n *ast.Node, entering bool) ast.WalkStatus {
		if !entering {
			return ast.WalkContinue
		}
		if n.Type == ast.NodeBlockQueryEmbed ||
			(n.Type == ast.NodeTextMark && n.IsTextMarkType("block-ref") && n.TextMarkBlockRefID == fixture.childID) {
			dangling++
		}
		return ast.WalkContinue
	})
	if 0 < dangling {
		t.Fatalf("expected %d dangling reference(s) cleaned, still found %d", dangling, dangling)
	}
	if refs := sql.QueryRefsByDefID(fixture.childID, false); 0 < len(refs) {
		t.Fatalf("stale refs remain after document deletion: %+v", refs)
	}
}
