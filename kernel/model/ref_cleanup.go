// SiYuan - https://github.com/siyuan-note/siyuan
// Copyright (c) 2020-present, b3log.org
// SPDX-License-Identifier: AGPL-3.0-or-later

package model

import (
	"strings"

	"github.com/88250/lute/ast"
	"github.com/88250/lute/parse"
	"github.com/siyuan-note/logging"
	"github.com/siyuan-note/siyuan/kernel/filesys"
	"github.com/siyuan-note/siyuan/kernel/sql"
	"github.com/siyuan-note/siyuan/kernel/treenode"
	"github.com/siyuan-note/siyuan/kernel/util"
)

// removeDanglingBlockRefs 在文档被删除后，清理其他文档中指向被删块/被删文档的引用与嵌入节点。
//
// removedBlockIDs 是被删文档（含子文档）包含的全部块 ID，removedRootIDs 是被删文档的根块 ID。
// removedBoxID/removedDocPath/removedChildrenDir 用于跳过同一批删除操作中的文档，
// 避免对正在删除的文档做无意义的重写。
//
// 该函数复用 refs 索引定位来源块，按文档分组后仅重写确实包含悬空引用的文档。
func removeDanglingBlockRefs(removedBlockIDs, removedRootIDs []string, removedBoxID, removedDocPath, removedChildrenDir string) {
	if 1 > len(removedBlockIDs) && 1 > len(removedRootIDs) {
		return
	}
	sql.FlushQueue()
	sources := sql.QueryRefSourcesByDefIDs(removedBlockIDs, removedRootIDs)
	if 1 > len(sources) {
		return
	}

	removedIDSet := map[string]struct{}{}
	for _, id := range removedBlockIDs {
		removedIDSet[id] = struct{}{}
	}
	for _, id := range removedRootIDs {
		removedIDSet[id] = struct{}{}
	}

	childrenPrefix := removedChildrenDir + "/"
	refIDs := make([]string, 0, len(sources))
	refIDSet := map[string]struct{}{}
	for _, ref := range sources {
		if ref.Box == removedBoxID &&
			(ref.Path == removedDocPath || ref.Path == removedChildrenDir || strings.HasPrefix(ref.Path, childrenPrefix)) {
			continue // 属于同一批删除的文档，无需清理
		}
		if _, ok := refIDSet[ref.BlockID]; ok {
			continue
		}
		refIDSet[ref.BlockID] = struct{}{}
		refIDs = append(refIDs, ref.BlockID)
	}
	if 1 > len(refIDs) {
		return
	}

	trees := filesys.LoadTrees(refIDs)
	changedTrees := map[string]*parse.Tree{}
	for _, tree := range trees {
		if nil == tree {
			continue
		}
		if _, ok := changedTrees[tree.ID]; ok {
			continue
		}
		if removeDanglingRefsFromTree(tree, removedIDSet) {
			changedTrees[tree.ID] = tree
		}
	}
	for _, tree := range changedTrees {
		if err := indexWriteTreeUpsertQueue(tree); err != nil {
			logging.LogErrorf("cleanup dangling refs: write tree [%s] failed: %s", tree.ID, err)
			continue
		}
		util.PushReloadDoc(tree.ID)
	}
	if 0 < len(changedTrees) {
		sql.FlushQueue()
	}
}

// removeDanglingRefsFromTree 删除树中所有指向 removed 集合的引用/嵌入节点，返回是否发生了修改。
// 支持行内引用（block-ref 文本标记）、块引用节点（NodeBlockRef）与查询嵌入块（NodeBlockQueryEmbed）。
func removeDanglingRefsFromTree(tree *parse.Tree, removed map[string]struct{}) (changed bool) {
	if nil == tree || nil == tree.Root || 1 > len(removed) {
		return
	}
	var toUnlink []*ast.Node
	treenode.WalkWithInlineTitles(tree.Root, func(n *ast.Node, entering bool) ast.WalkStatus {
		if !entering {
			return ast.WalkContinue
		}
		switch n.Type {
		case ast.NodeTextMark:
			if n.IsTextMarkType("block-ref") {
				if _, ok := removed[n.TextMarkBlockRefID]; ok {
					toUnlink = append(toUnlink, n)
				}
			}
		case ast.NodeBlockRef:
			if refID := n.ChildByType(ast.NodeBlockRefID); nil != refID {
				if _, ok := removed[strings.TrimSpace(refID.TokensStr())]; ok {
					toUnlink = append(toUnlink, n)
				}
			}
		case ast.NodeBlockQueryEmbed:
			if defID := treenode.GetEmbedBlockRef(n); "" != defID {
				if _, ok := removed[defID]; ok {
					toUnlink = append(toUnlink, n)
				}
			}
		}
		return ast.WalkContinue
	})
	for _, n := range toUnlink {
		if nil != n.Parent {
			n.Unlink()
			changed = true
		}
	}
	return
}
