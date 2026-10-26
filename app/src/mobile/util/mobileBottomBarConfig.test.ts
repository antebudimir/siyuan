import {describe, it} from "node:test";
import * as assert from "node:assert/strict";
import {
    createDefaultMobileBottomBarConfig,
    DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS,
    isMobileBottomBarBuiltInAction,
    MOBILE_BOTTOM_BAR_CONFIG_VERSION,
    normalizeMobileBottomBarConfig,
    reduceMobileBottomBarConfig,
    resolveMobileBottomBarAvailability,
} from "./mobileBottomBarConfig";
import {getPluginDockEntryKey} from "../../plugin/dockKey";

describe("mobile bottom bar config", () => {
    it("falls back to the default for malformed storage values", () => {
        [
            null,
            false,
            "not json",
            [],
            {version: 4, actions: ["recent", "outline", "bookmark", "tag", "back"]},
            {version: MOBILE_BOTTOM_BAR_CONFIG_VERSION, actions: "documents"},
        ].forEach((storedValue) => {
            assert.deepEqual(normalizeMobileBottomBarConfig(storedValue), createDefaultMobileBottomBarConfig());
        });
    });

    it("uses back, forward, documents, tabs, search, and newDoc by default", () => {
        assert.deepEqual(DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS, ["back", "forward", "documents", "tabs", "search", "newDoc"]);
    });

    it("migrates the legacy default to the new six-slot default", () => {
        const config = normalizeMobileBottomBarConfig({
            version: 1,
            actions: ["documents", "search", "newDoc", "tabs"],
        });

        assert.deepEqual(config, createDefaultMobileBottomBarConfig());
    });

    it("migrates version 2 configs and backfills the added slot", () => {
        const config = normalizeMobileBottomBarConfig({
            version: 2,
            actions: ["recent", "outline", "bookmark", "tag", "back"],
        });

        assert.equal(config.version, MOBILE_BOTTOM_BAR_CONFIG_VERSION);
        assert.deepEqual(config.actions, ["recent", "outline", "bookmark", "tag", "back", "forward"]);
    });

    it("backfills a stored five-action config with the new default slot without a version bump", () => {
        const config = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["back", "forward", "documents", "tabs", "search"],
        });

        assert.equal(config.version, MOBILE_BOTTOM_BAR_CONFIG_VERSION);
        assert.deepEqual(config.actions, ["back", "forward", "documents", "tabs", "search", "newDoc"]);
    });

    it("preserves customized legacy slots and appends back", () => {
        const config = normalizeMobileBottomBarConfig({
            version: 1,
            actions: ["recent", "outline", "bookmark", "tag"],
        });

        assert.deepEqual(config.actions, ["recent", "outline", "bookmark", "tag", "back", "forward"]);
    });

    it("accepts serialized config and fills invalid or duplicate slots in order", () => {
        const config = normalizeMobileBottomBarConfig(JSON.stringify({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["recent", "recent", "unknown", "tag"],
        }));

        assert.deepEqual(config.actions, ["recent", "back", "forward", "tag", "documents", "tabs"]);
        assert.equal(config.actions.length, 6);
        assert.equal(new Set(config.actions).size, 6);
        assert.equal(config.actions.every(isMobileBottomBarBuiltInAction), true);
    });

    it("swaps slots when selecting an action already in the bottom bar", () => {
        const config = reduceMobileBottomBarConfig(createDefaultMobileBottomBarConfig(), {
            type: "select-action",
            slot: 0,
            action: "tabs",
        });

        assert.deepEqual(config.actions, ["tabs", "forward", "documents", "back", "search", "newDoc"]);
    });

    it("swaps the sixth slot when selecting an action already in the bottom bar", () => {
        const config = reduceMobileBottomBarConfig(createDefaultMobileBottomBarConfig(), {
            type: "select-action",
            slot: 5,
            action: "search",
        });

        assert.deepEqual(config.actions, ["back", "forward", "documents", "tabs", "newDoc", "search"]);
    });

    it("supports bookmarks, backlinks, the agent, spaced repetition, and forward as configurable actions", () => {
        const config = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["bookmark", "backlink", "agent", "spacedRepetition", "forward"],
        });

        assert.deepEqual(config.actions, ["bookmark", "backlink", "agent", "spacedRepetition", "forward", "back"]);
    });

    it("supports selecting and quickly creating daily notes", () => {
        const config = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["dailyNote", "newDailyNote", "documents", "tabs", "back"],
        });

        assert.deepEqual(config.actions, ["dailyNote", "newDailyNote", "documents", "tabs", "back", "forward"]);
    });

    it("replaces a slot when selecting an unused action", () => {
        const config = reduceMobileBottomBarConfig(createDefaultMobileBottomBarConfig(), {
            type: "select-action",
            slot: 1,
            action: "outline",
        });

        assert.deepEqual(config.actions, ["back", "outline", "documents", "tabs", "search", "newDoc"]);
    });

    it("resets customized actions to a fresh default config", () => {
        const customized = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["recent", "outline", "bookmark", "command", "back"],
        });
        const config = reduceMobileBottomBarConfig(customized, {type: "reset"});

        assert.equal(config.version, MOBILE_BOTTOM_BAR_CONFIG_VERSION);
        assert.deepEqual(config.actions, DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS);
        assert.notEqual(config.actions, DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS);
    });

    it("replaces actions that are unavailable in the current mode", () => {
        const config = resolveMobileBottomBarAvailability({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["back", "forward", "documents", "newDoc", "tabs"],
        }, ["newDoc"]);

        assert.deepEqual(config.actions, ["back", "forward", "documents", "newFileRef", "tabs", "search"]);
        assert.equal(config.actions.includes("newDoc"), false);
    });

    it("replaces the agent when AI is unavailable", () => {
        const config = resolveMobileBottomBarAvailability({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["documents", "agent", "newDoc", "tabs", "back"],
        }, ["agent"]);

        assert.deepEqual(config.actions, ["documents", "search", "newDoc", "tabs", "back", "forward"]);
    });

    it("replaces spaced repetition in read-only mode", () => {
        const config = resolveMobileBottomBarAvailability({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["documents", "spacedRepetition", "search", "tabs", "back"],
        }, ["spacedRepetition"]);

        assert.deepEqual(config.actions, ["documents", "newDoc", "search", "tabs", "back", "forward"]);
    });

    it("replaces daily note actions when document creation is unavailable", () => {
        const config = resolveMobileBottomBarAvailability({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: ["dailyNote", "newDailyNote", "documents", "tabs", "back"],
        }, ["dailyNote", "newDailyNote"]);

        assert.deepEqual(config.actions, ["search", "newDoc", "documents", "tabs", "back", "forward"]);
    });

    it("accepts stable plugin dock keys and rejects malformed keys", () => {
        const pluginAction = getPluginDockEntryKey("plugin.one", "dock.one");
        const config = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: [pluginAction, "plugin::dock", "plugin:name:", "plugin:name:dock:extra", "search"],
        });

        assert.deepEqual(config.actions, [pluginAction, "back", "forward", "documents", "search", "tabs"]);
    });

    it("swaps stable plugin dock actions between slots", () => {
        const pluginAction = getPluginDockEntryKey("sample-plugin", "sample-dock");
        const state = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: [pluginAction, "forward", "documents", "tabs", "search"],
        });
        const config = reduceMobileBottomBarConfig(state, {
            type: "select-action",
            slot: 3,
            action: pluginAction,
        });

        assert.deepEqual(config.actions, ["tabs", "forward", "documents", pluginAction, "search", "back"]);
    });

    it("temporarily replaces a missing plugin without changing the stored config", () => {
        const pluginAction = getPluginDockEntryKey("sample-plugin", "sample-dock");
        const storedConfig = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: [pluginAction, "forward", "documents", "tabs", "search"],
        });
        const resolvedConfig = resolveMobileBottomBarAvailability(storedConfig, [pluginAction]);

        assert.deepEqual(resolvedConfig.actions, ["newDoc", "forward", "documents", "tabs", "search", "back"]);
        assert.equal(storedConfig.actions[0], pluginAction);
        assert.deepEqual(resolveMobileBottomBarAvailability(storedConfig, []).actions, storedConfig.actions);
    });

    it("keeps a missing plugin action when another stored slot changes", () => {
        const pluginAction = getPluginDockEntryKey("sample-plugin", "sample-dock");
        const storedConfig = normalizeMobileBottomBarConfig({
            version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
            actions: [pluginAction, "forward", "documents", "tabs", "search"],
        });
        const config = reduceMobileBottomBarConfig(storedConfig, {
            type: "select-action",
            slot: 1,
            action: "outline",
        });

        assert.deepEqual(config.actions, [pluginAction, "outline", "documents", "tabs", "search", "back"]);
    });
});
