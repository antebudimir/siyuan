// SiYuan - https://github.com/siyuan-note/siyuan
// Copyright (c) 2020-present, b3log.org
// SPDX-License-Identifier: AGPL-3.0-or-later

package model

import (
	"testing"

	"github.com/88250/lute/ast"
	"github.com/siyuan-note/siyuan/kernel/treenode"
)

func TestRemoveDanglingRefsFromTree(t *testing.T) {
	const (
		removedInline   = "20261024084717-n8rywv1"
		keptInline      = "20261024084717-n8rywv2"
		removedEmbed    = "20261024084717-n8rywv3"
		removedBlockRef = "20261024084717-n8rywv4"
	)

	tree := treenode.NewTree("20260718000000-abcdefg", "/"+ast.NewNodeID()+".sy", "/Test", "Test")
	paragraph := tree.Root.FirstChild
	paragraph.AppendChild(&ast.Node{Type: ast.NodeTextMark, TextMarkType: "block-ref",
		TextMarkBlockRefID: removedInline, TextMarkBlockRefSubtype: "s", TextMarkTextContent: "removed"})
	paragraph.AppendChild(&ast.Node{Type: ast.NodeText, Tokens: []byte(" keep ")})
	paragraph.AppendChild(&ast.Node{Type: ast.NodeTextMark, TextMarkType: "block-ref",
		TextMarkBlockRefID: keptInline, TextMarkBlockRefSubtype: "s", TextMarkTextContent: "kept"})

	blockRef := &ast.Node{Type: ast.NodeBlockRef, ID: ast.NewNodeID()}
	blockRef.AppendChild(&ast.Node{Type: ast.NodeBlockRefID, Tokens: []byte(removedBlockRef)})
	tree.Root.AppendChild(blockRef)

	embed := &ast.Node{Type: ast.NodeBlockQueryEmbed, ID: ast.NewNodeID()}
	embed.AppendChild(&ast.Node{Type: ast.NodeBlockQueryEmbedScript,
		Tokens: []byte("select * from blocks where id='" + removedEmbed + "'")})
	tree.Root.AppendChild(embed)

	removed := map[string]struct{}{removedInline: {}, removedEmbed: {}, removedBlockRef: {}}
	if changed := removeDanglingRefsFromTree(tree, removed); !changed {
		t.Fatal("expected the tree to change")
	}

	inlineIDs := map[string]bool{}
	var embeds, blockRefs int
	treenode.WalkWithInlineTitles(tree.Root, func(n *ast.Node, entering bool) ast.WalkStatus {
		if !entering {
			return ast.WalkContinue
		}
		switch n.Type {
		case ast.NodeTextMark:
			if n.IsTextMarkType("block-ref") {
				inlineIDs[n.TextMarkBlockRefID] = true
			}
		case ast.NodeBlockQueryEmbed:
			embeds++
		case ast.NodeBlockRef:
			blockRefs++
		}
		return ast.WalkContinue
	})
	if inlineIDs[removedInline] {
		t.Fatal("inline ref to a removed block survived")
	}
	if !inlineIDs[keptInline] {
		t.Fatal("inline ref to a kept block was removed")
	}
	if embeds != 0 {
		t.Fatalf("expected embed to be removed, got %d", embeds)
	}
	if blockRefs != 0 {
		t.Fatalf("expected block-ref node to be removed, got %d", blockRefs)
	}
	if changed := removeDanglingRefsFromTree(tree, removed); changed {
		t.Fatal("second pass should be a no-op")
	}
}
