import {isPluginDockEntryKey, type PluginDockEntryKey} from "../../plugin/dockKey";

export const MOBILE_BOTTOM_BAR_CONFIG_VERSION = 3 as const;
export const MOBILE_BOTTOM_BAR_SLOT_COUNT = 6 as const;

export const MOBILE_BOTTOM_BAR_ACTIONS = [
    "back",
    "forward",
    "documents",
    "search",
    "newDoc",
    "newFileRef",
    "tabs",
    "recent",
    "outline",
    "bookmark",
    "tag",
    "backlink",
    "agent",
    "spacedRepetition",
    "dailyNote",
    "newDailyNote",
    "command",
    "docMenu",
] as const;

export type MobileBottomBarBuiltInAction = typeof MOBILE_BOTTOM_BAR_ACTIONS[number];
export type MobileBottomBarAction = MobileBottomBarBuiltInAction | PluginDockEntryKey;
export type MobileBottomBarSlot = 0 | 1 | 2 | 3 | 4 | 5;
export type MobileBottomBarSlots = readonly [
    MobileBottomBarAction,
    MobileBottomBarAction,
    MobileBottomBarAction,
    MobileBottomBarAction,
    MobileBottomBarAction,
    MobileBottomBarAction,
];

export interface IMobileBottomBarConfig {
    version: typeof MOBILE_BOTTOM_BAR_CONFIG_VERSION,
    actions: MobileBottomBarSlots,
}

export type MobileBottomBarConfigEvent = {
    type: "select-action",
    slot: MobileBottomBarSlot,
    action: MobileBottomBarAction,
} | {
    type: "reset",
};

export const DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS = [
    "back",
    "forward",
    "documents",
    "tabs",
    "search",
    "newDoc",
] as const satisfies MobileBottomBarSlots;

const LEGACY_DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS = ["documents", "search", "newDoc", "tabs"];

const mobileBottomBarActionSet = new Set<string>(MOBILE_BOTTOM_BAR_ACTIONS);

// 旧版属性面板动作已替换为文档菜单，读取历史配置时迁移持久化的动作键。
const normalizeMobileBottomBarAction = (action: unknown) =>
    action === "docInfo" ? "docMenu" : action;

export const isMobileBottomBarBuiltInAction = (value: unknown): value is MobileBottomBarBuiltInAction => {
    return typeof value === "string" && mobileBottomBarActionSet.has(value);
};

export const isMobileBottomBarAction = (value: unknown): value is MobileBottomBarAction => {
    return isMobileBottomBarBuiltInAction(value) || isPluginDockEntryKey(value);
};

const toMobileBottomBarSlots = (actions: MobileBottomBarAction[]): MobileBottomBarSlots => [
    actions[0],
    actions[1],
    actions[2],
    actions[3],
    actions[4],
    actions[5],
];

const normalizeMobileBottomBarActions = (storedActions: unknown[]): MobileBottomBarSlots => {
    const actions = new Array<MobileBottomBarAction>(MOBILE_BOTTOM_BAR_SLOT_COUNT);
    const usedActions = new Set<MobileBottomBarAction>();

    for (let slot = 0; slot < MOBILE_BOTTOM_BAR_SLOT_COUNT; slot++) {
        const action = normalizeMobileBottomBarAction(storedActions[slot]);
        if (isMobileBottomBarAction(action) && !usedActions.has(action)) {
            actions[slot] = action;
            usedActions.add(action);
        }
    }

    const fallbackActions: readonly MobileBottomBarBuiltInAction[] = [
        ...DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS,
        ...MOBILE_BOTTOM_BAR_ACTIONS,
    ];
    let fallbackIndex = 0;
    for (let slot = 0; slot < actions.length; slot++) {
        if (actions[slot]) {
            continue;
        }
        while (usedActions.has(fallbackActions[fallbackIndex])) {
            fallbackIndex++;
        }
        actions[slot] = fallbackActions[fallbackIndex];
        usedActions.add(actions[slot]);
    }

    return toMobileBottomBarSlots(actions);
};

export const createDefaultMobileBottomBarConfig = (): IMobileBottomBarConfig => ({
    version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
    actions: [...DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS],
});

export const normalizeMobileBottomBarConfig = (storedValue: unknown): IMobileBottomBarConfig => {
    let value = storedValue;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch {
            return createDefaultMobileBottomBarConfig();
        }
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return createDefaultMobileBottomBarConfig();
    }

    const record = value as Record<string, unknown>;
    if ((record.version !== 1 && record.version !== 2 && record.version !== MOBILE_BOTTOM_BAR_CONFIG_VERSION) ||
        !Array.isArray(record.actions)) {
        return createDefaultMobileBottomBarConfig();
    }
    if (record.version === 1 && record.actions.length === LEGACY_DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS.length &&
        record.actions.every((action, index) => action === LEGACY_DEFAULT_MOBILE_BOTTOM_BAR_ACTIONS[index])) {
        return createDefaultMobileBottomBarConfig();
    }
    return {
        version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
        actions: normalizeMobileBottomBarActions(record.actions),
    };
};

export const resolveMobileBottomBarAvailability = (
    storedValue: unknown,
    unavailableActions: readonly MobileBottomBarAction[],
): IMobileBottomBarConfig => {
    const config = normalizeMobileBottomBarConfig(storedValue);
    const unavailable = new Set(unavailableActions);
    const actions = [...config.actions];
    actions.forEach((action, slot) => {
        if (!unavailable.has(action)) {
            return;
        }
        const replacement = MOBILE_BOTTOM_BAR_ACTIONS.find((candidate) =>
            !unavailable.has(candidate) && !actions.includes(candidate)
        );
        if (replacement) {
            actions[slot] = replacement;
        }
    });
    return {
        version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
        actions: toMobileBottomBarSlots(actions),
    };
};

export const reduceMobileBottomBarConfig = (
    state: IMobileBottomBarConfig,
    event: MobileBottomBarConfigEvent,
): IMobileBottomBarConfig => {
    if (event.type === "reset") {
        return createDefaultMobileBottomBarConfig();
    }

    const currentState = normalizeMobileBottomBarConfig(state);
    const actions = [...currentState.actions];
    const existingSlot = actions.indexOf(event.action);
    if (existingSlot === event.slot) {
        return currentState;
    }
    if (existingSlot >= 0) {
        actions[existingSlot] = actions[event.slot];
    }
    actions[event.slot] = event.action;
    return {
        version: MOBILE_BOTTOM_BAR_CONFIG_VERSION,
        actions: toMobileBottomBarSlots(actions),
    };
};
