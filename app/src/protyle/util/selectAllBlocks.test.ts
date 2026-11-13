import * as assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as path from "node:path";
import {afterEach, describe, it} from "node:test";
import {ModuleKind, ScriptTarget, transpileModule} from "typescript";

interface ICallLog {
    loadAll: Array<unknown[]>;
    selected: number;
    counted: Array<Array<string | null>>;
    messages: Array<unknown[]>;
    multiSelect: number;
    toolbarCounts: number[];
    focused: unknown[];
    hidden: string[][];
    ranges: number;
    blur: number;
}

interface IFixtureOptions {
    unloaded?: boolean;
    loadResult?: boolean | Error;
    loadPromise?: Promise<boolean>;
    mobile?: boolean;
    autoLoad?: boolean;
    multiSelect?: boolean;
    switchDocument?: boolean;
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
    if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
    } else {
        Reflect.deleteProperty(globalThis, "window");
    }
});

const createFixture = (options: IFixtureOptions = {}) => {
    const calls: ICallLog = {loadAll: [], selected: 0, counted: [], messages: [], multiSelect: 0,
        toolbarCounts: [], focused: [], hidden: [], ranges: 0, blur: 0};
    const blocks = ["first", "second"].map(id => ({
        getAttribute: (name: string) => name === "data-node-id" ? id : null,
    }));
    const editorElement = {firstElementChild: blocks[0]};
    const protyle: any = {
        lite: false,
        element: {isConnected: true},
        block: {rootID: "root", parentID: "parent", showAll: false, scroll: true},
        options: {backlinkData: undefined},
        wysiwyg: {element: editorElement},
        toolbar: {
            subElement: {},
            isMultiSelectMode: () => !!options.multiSelect,
            showMultiSelectMode: () => { calls.multiSelect++; },
        },
        scroll: {
            loadAll: (...args: unknown[]) => {
                calls.loadAll.push(args);
                if (options.switchDocument) {
                    protyle.block.rootID = "switched";
                }
                if (options.loadResult instanceof Error) {
                    return Promise.reject(options.loadResult);
                }
                if (options.loadPromise) {
                    return options.loadPromise;
                }
                return Promise.resolve(options.loadResult !== false);
            },
        },
    };
    Object.defineProperty(globalThis, "window", {configurable: true, value: {
        siyuan: {config: {appearance: {notifications: options.autoLoad === false ?
            {selectAllIncompleteTip: false} : {}}}},
        getSelection: () => ({removeAllRanges: () => { calls.ranges++; }}),
    }});
    const source = transpileModule(readFileSync(path.join(__dirname, "selectAllBlocks.ts"), "utf8"), {
        compilerOptions: {module: ModuleKind.CommonJS, target: ScriptTarget.ES2020},
    }).outputText;
    const exports: Record<string, any> = {};
    const dependencies: Record<string, any> = {
        "../../dialog/message": {showMessage: (...args: unknown[]) => {
            calls.messages.push(args);
            return "message-id";
        }},
        "../../layout/status": {countBlockWord: (ids: Array<string | null>) => { calls.counted.push(ids); }},
        "../../mobile/util/keyboardToolbar": {activeBlur: () => { calls.blur++; }},
        "../../mobile/util/multiSelectToolbar": {updateMultiSelectToolbar: (_element: unknown, count: number) => {
            calls.toolbarCounts.push(count);
        }},
        "../../util/escape": {escapeHtml: (text: string) => text},
        "../../util/functions": {isMobile: () => !!options.mobile},
        "../ui/hideElements": {hideElements: (types: string[]) => { calls.hidden.push(types); }},
        "../wysiwyg/blockSelection": {selectAllLoadedBlocks: () => {
            calls.selected++;
            return blocks;
        }},
        "./documentRange": {hasUnloadedDocumentBlocks: () => options.unloaded !== false},
        "./selection": {focusBlock: (block: unknown) => { calls.focused.push(block); }},
    };
    new Function("require", "exports", source)((dependency: string) => dependencies[dependency], exports);
    const loadAllAndSelectBlocks = exports.loadAllAndSelectBlocks as (target: any) => Promise<boolean>;
    return {calls, protyle, loadAllAndSelectBlocks};
};


describe("loadAllAndSelectBlocks", () => {
    it("loads the remaining document blocks before selecting everything", async () => {
        const f = createFixture();
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), true);
        assert.deepEqual(f.calls.loadAll, [[f.protyle, {progressDelay: 300}]]);
        assert.equal(f.calls.selected, 1);
        assert.deepEqual(f.calls.counted, [["first", "second"]]);
        assert.deepEqual(f.calls.focused, [f.protyle.wysiwyg.element.firstElementChild]);
        assert.deepEqual(f.calls.hidden, [["toolbar"]]);
        assert.deepEqual(f.calls.messages, []);
        assert.equal(f.calls.multiSelect, 0);
    });

    it("skips loading when the whole document is already loaded", async () => {
        const f = createFixture({unloaded: false});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), true);
        assert.deepEqual(f.calls.loadAll, []);
        assert.equal(f.calls.selected, 1);
        assert.deepEqual(f.calls.messages, []);
    });

    it("keeps only loaded blocks selected when auto-loading is disabled", async () => {
        const f = createFixture({autoLoad: false});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), true);
        assert.deepEqual(f.calls.loadAll, []);
        assert.equal(f.calls.selected, 1);
        assert.deepEqual(f.calls.messages, []);
    });

    it("does not select blocks when loading does not finish", async () => {
        const f = createFixture({loadResult: false});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), false);
        assert.equal(f.calls.loadAll.length, 1);
        assert.equal(f.calls.selected, 0);
    });

    it("does not select blocks when another document replaced the editor during loading", async () => {
        const f = createFixture({switchDocument: true});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), false);
        assert.equal(f.calls.selected, 0);
    });

    it("reports loading errors without selecting blocks", async () => {
        const f = createFixture({loadResult: new Error("load failed")});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), false);
        assert.equal(f.calls.selected, 0);
        assert.equal(f.calls.messages.length, 1);
        assert.equal(f.calls.messages[0][0], "load failed");
        assert.equal(f.calls.messages[0][1], 7000);
        assert.equal(f.calls.messages[0][2], "error");
    });

    it("ignores repeated requests while the first load is still running", async () => {
        let resolveLoad: (value: boolean) => void;
        const loadPromise = new Promise<boolean>(resolve => { resolveLoad = resolve; });
        const f = createFixture({loadPromise});
        const first = f.loadAllAndSelectBlocks(f.protyle);
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), false);
        assert.equal(f.calls.loadAll.length, 1);
        resolveLoad(true);
        assert.equal(await first, true);
        assert.equal(f.calls.selected, 1);
    });

    it("enters multi-select mode on mobile after selecting the whole document", async () => {
        const f = createFixture({mobile: true});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), true);
        assert.equal(f.calls.multiSelect, 1);
        assert.deepEqual(f.calls.toolbarCounts, []);
        assert.equal(f.calls.ranges, 1);
        assert.equal(f.calls.blur, 1);
        assert.deepEqual(f.calls.focused, []);
    });

    it("updates the existing mobile multi-select toolbar without reopening it", async () => {
        const f = createFixture({mobile: true, multiSelect: true});
        assert.equal(await f.loadAllAndSelectBlocks(f.protyle), true);
        assert.equal(f.calls.multiSelect, 0);
        assert.deepEqual(f.calls.toolbarCounts, [2]);
    });
});
