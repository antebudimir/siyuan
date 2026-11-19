// SiYuan - https://github.com/siyuan-note/siyuan
// Copyright (c) 2020-present, b3log.org
// SPDX-License-Identifier: AGPL-3.0-or-later

//go:build fts5

package model

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/88250/lute/parse"
	"github.com/siyuan-note/siyuan/kernel/filesys"
	"github.com/siyuan-note/siyuan/kernel/sql"
	"github.com/siyuan-note/siyuan/kernel/treenode"
	"github.com/siyuan-note/siyuan/kernel/util"
)

const setDocSortModeTestEnv = "SIYUAN_TEST_SET_DOC_SORT_MODE"
const setDocTreeSortRecursiveTestEnv = "SIYUAN_TEST_SET_DOC_TREE_SORT_RECURSIVE"

// setupDocSortModeTest 在子进程中初始化 SQL 数据库，避免同进程重复初始化。
func setupDocSortModeTest(t *testing.T, env, run string) *fileOperationTestFixture {
	t.Helper()
	if "1" != os.Getenv(env) {
		cmd := exec.Command(os.Args[0], "-test.run=^"+run+"$", "-test.v")
		cmd.Env = append(os.Environ(), env+"=1")
		output, err := cmd.CombinedOutput()
		if nil != err {
			t.Fatalf("%s subprocess failed: %v\n%s", run, err, output)
		}
		return nil
	}

	fixture := setupFileOperationTest(t)
	originalTempDir := util.TempDir
	originalQueueDir := util.QueueDir
	originalConfDir := util.ConfDir
	originalDBPath := util.DBPath
	originalHistoryDBPath := util.HistoryDBPath
	originalAssetContentDBPath := util.AssetContentDBPath
	util.TempDir = t.TempDir()
	util.QueueDir = filepath.Join(util.TempDir, "queue")
	util.ConfDir = filepath.Join(util.TempDir, "conf")
	util.DBPath = filepath.Join(util.TempDir, util.DBName)
	util.HistoryDBPath = filepath.Join(util.TempDir, "history.db")
	util.AssetContentDBPath = filepath.Join(util.TempDir, "asset_content.db")
	for _, dir := range []string{util.QueueDir, util.ConfDir} {
		if err := os.MkdirAll(dir, 0755); nil != err {
			t.Fatalf("create test directory [%s] failed: %v", dir, err)
		}
	}
	sql.InitDatabase(true)
	sql.InitHistoryDatabase(true)
	sql.InitAssetContentDatabase(true)
	for _, p := range []string{fixture.sourcePath, fixture.targetPath} {
		tree, loadErr := filesys.LoadTree(fixture.box.ID, p, util.NewLute())
		if nil != loadErr {
			t.Fatalf("reload fixture document [%s] failed: %v", p, loadErr)
		}
		treenode.UpsertBlockTree(tree)
	}
	t.Cleanup(func() {
		closeModelTestDatabases()
		util.TempDir = originalTempDir
		util.QueueDir = originalQueueDir
		util.ConfDir = originalConfDir
		util.DBPath = originalDBPath
		util.HistoryDBPath = originalHistoryDBPath
		util.AssetContentDBPath = originalAssetContentDBPath
	})
	return fixture
}

func TestSetDocSortModeValidationAndPersistence(t *testing.T) {
	fixture := setupDocSortModeTest(t, setDocSortModeTestEnv, "TestSetDocSortModeValidationAndPersistence")
	if nil == fixture {
		return
	}
	if warmed := fixture.box.docIAL(fixture.sourcePath); nil == warmed {
		t.Fatal("failed to warm source document IAL cache")
	}
	tree, err := LoadTreeByBlockID(fixture.sourceID)
	if nil != err {
		t.Fatalf("load source document failed: %v", err)
	}
	updated := tree.Root.IALAttr("updated")
	mode := util.SortModeSubDocCountDESC
	result, err := SetDocSortMode(fixture.sourceID, &mode)
	if nil != err {
		t.Fatalf("set document sort mode failed: %v", err)
	}
	if result.ID != fixture.sourceID || nil == result.SortMode || mode != *result.SortMode || mode != result.EffectiveSortMode {
		t.Fatalf("unexpected set document sort mode result: %#v", result)
	}
	if immediate := fixture.box.docIAL(fixture.sourcePath); "14" != immediate[DocSortModeAttr] {
		t.Fatalf("immediate document IAL read returned a stale sort mode: %q", immediate[DocSortModeAttr])
	}
	resolvedMode, resolveErr := ResolveDocTreeSortMode(fixture.box.ID, fixture.sourcePath)
	if nil != resolveErr || mode != resolvedMode {
		t.Fatalf("immediate sort mode resolution returned mode=%d, err=%v", resolvedMode, resolveErr)
	}

	tree, err = LoadTreeByBlockID(fixture.sourceID)
	if nil != err {
		t.Fatalf("reload source document failed: %v", err)
	}
	if tree.Root.IALAttr(DocSortModeAttr) != "14" {
		t.Fatalf("document sort mode was not persisted: %q", tree.Root.IALAttr(DocSortModeAttr))
	}
	if tree.Root.IALAttr("updated") != updated {
		t.Fatalf("setting document sort mode changed updated: got %q, want %q", tree.Root.IALAttr("updated"), updated)
	}

	for _, invalid := range []int{-1, util.SortModeFileTree, util.SortModeUnassigned} {
		if _, setErr := SetDocSortMode(fixture.sourceID, &invalid); nil == setErr {
			t.Fatalf("invalid document sort mode [%d] was accepted", invalid)
		}
	}
	if err = SetBlockAttrs(fixture.sourceID, map[string]string{DocSortModeAttr: "15"}); nil == err {
		t.Fatal("generic block attribute API accepted an invalid document sort mode")
	}
	if err = SetBlockAttrs(fixture.childID, map[string]string{DocSortModeAttr: "1"}); nil == err {
		t.Fatal("generic block attribute API accepted a document sort mode on a non-document block")
	}

	clearResult, err := SetDocSortMode(fixture.sourceID, nil)
	if nil != err {
		t.Fatalf("remove document sort mode failed: %v", err)
	}
	if nil != clearResult.SortMode || Conf.FileTree.Load().Sort != clearResult.EffectiveSortMode {
		t.Fatalf("cleared document sort mode did not inherit the global mode: %#v", clearResult)
	}
	tree, err = LoadTreeByBlockID(fixture.sourceID)
	if nil != err {
		t.Fatalf("reload source document after removing sort mode failed: %v", err)
	}
	if "" != tree.Root.IALAttr(DocSortModeAttr) {
		t.Fatalf("document sort mode was not removed: %q", tree.Root.IALAttr(DocSortModeAttr))
	}
}

func TestSetDocTreeSortRecursiveAppliesAndClearsInheritance(t *testing.T) {
	fixture := setupDocSortModeTest(t, setDocTreeSortRecursiveTestEnv, "TestSetDocTreeSortRecursiveAppliesAndClearsInheritance")
	if nil == fixture {
		return
	}
	Conf.FileTree.Load().Sort = util.SortModeNameASC
	parent := treenode.NewTree(fixture.box.ID, "/"+fixture.sourceID+"/20260718000003-parent1.sy", "/Source/Parent", "Parent")
	child := treenode.NewTree(fixture.box.ID, strings.TrimSuffix(parent.Path, ".sy")+"/20260718000004-child01.sy", "/Source/Parent/Child", "Child")
	grandchild := treenode.NewTree(fixture.box.ID, strings.TrimSuffix(child.Path, ".sy")+"/20260718000005-grand01.sy", "/Source/Parent/Child/Grandchild", "Grandchild")
	trees := []*parse.Tree{parent, child, grandchild}
	for _, tree := range trees {
		if _, err := filesys.WriteTree(tree); nil != err {
			t.Fatal(err)
		}
		treenode.UpsertBlockTree(tree)
	}
	readMode := func(tree *parse.Tree) string {
		ial, err := filesys.DocIAL(filepath.Join(util.DataDir, fixture.box.ID, tree.Path))
		if nil != err {
			t.Fatal(err)
		}
		return ial[DocSortModeAttr]
	}

	recursiveMode := util.SortModeUpdatedDESC + 16
	if err := SetDocTreeSortRecursive(fixture.box.ID, "/", &recursiveMode); nil != err {
		t.Fatalf("recursive sort failed: %v", err)
	}
	for _, tree := range []*parse.Tree{parent, child} {
		if got := readMode(tree); got != strconv.Itoa(util.SortModeUpdatedDESC) {
			t.Fatalf("expected recursive mode on %s, got %q", tree.ID, got)
		}
	}
	if got := readMode(grandchild); "" != got {
		t.Fatalf("leaf document should not declare a sort mode, got %q", got)
	}
	if mode := fixture.box.GetConf().SortMode; util.SortModeUpdatedDESC != mode {
		t.Fatalf("expected notebook mode %d, got %d", util.SortModeUpdatedDESC, mode)
	}

	if err := SetDocTreeSortRecursive(fixture.box.ID, "/", nil); nil != err {
		t.Fatalf("clearing recursive sort failed: %v", err)
	}
	for _, tree := range trees {
		if got := readMode(tree); "" != got {
			t.Fatalf("expected cleared mode on %s, got %q", tree.ID, got)
		}
	}
	if mode := fixture.box.GetConf().SortMode; util.SortModeFileTree != mode {
		t.Fatalf("expected notebook inheritance %d, got %d", util.SortModeFileTree, mode)
	}
}
