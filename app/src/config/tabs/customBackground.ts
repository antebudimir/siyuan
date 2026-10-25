import {ICustomBackground, normalizeCustomBackground} from "../../util/bodyGradient";
import {appearanceConfigApi} from "./appearanceRuntime";
import {setCustomBackground} from "../../util/assets";

const mountedConfigs = new WeakMap<HTMLElement, {
    config: ICustomBackground;
    revision: number;
    editing: boolean;
}>();

export const syncCustomBackground = (background = window.siyuan.config.appearance.customBackground) => {
    document.querySelectorAll<HTMLElement>("[data-custombg]").forEach(element => {
        const mountedConfig = mountedConfigs.get(element);
        // 保留尚未确认的本地编辑，避免较早的推送覆盖连续切换或拖动中的数值。
        const config = mountedConfig?.editing ? mountedConfig.config : normalizeCustomBackground(background);
        if (mountedConfig && !mountedConfig.editing) {
            Object.assign(mountedConfig.config, config);
        }
        if (mountedConfig?.editing) {
            setCustomBackground(config);
        }
        element.querySelector<HTMLSelectElement>("[data-custombg-mode]").value = config.mode;
        element.querySelector("[data-custombg-colors]").classList.toggle("fn__none", config.mode !== "custom");
        element.querySelectorAll<HTMLElement>("[data-custombg-theme]").forEach(row => {
            const theme = row.dataset.custombgTheme as "light" | "dark";
            row.querySelector<HTMLInputElement>("input[type=color]").value = config[theme];
        });
    });
};

export const genCustomBackgroundHtml = () => {
    const config = normalizeCustomBackground(window.siyuan.config.appearance.customBackground);
    const lang = window.siyuan.languages;
    const disabled = window.siyuan.config.readonly ? " disabled" : "";
    return `<div class="b3-label config-item" data-custombg>
    <div class="fn__flex">
        <div class="fn__flex-1 config-item__main">
            <div class="config-name">${lang.customBackground}</div>
            <div class="b3-label__text">${lang.customBackgroundTip}</div>
        </div>
        <span class="fn__space"></span>
        <select class="b3-select fn__flex-center fn__size200" data-custombg-mode aria-label="${lang.customBackground}"${disabled}>
            ${[["theme", lang.customBackgroundTheme], ["custom", lang.custom]].map(([value, label]) =>
        `<option value="${value}"${config.mode === value ? " selected" : ""}>${label}</option>`).join("")}
        </select>
    </div>
    <div data-custombg-colors class="${config.mode === "custom" ? "" : "fn__none"}">
        ${(["light", "dark"] as const).map(theme => `<div class="config-custom-background" data-custombg-theme="${theme}">
            <label class="config-custom-background__color" for="customBackground-${theme}-color">
                <span class="fn__flex-1">${theme === "light" ? lang.themeLight : lang.themeDark}</span>
                <input id="customBackground-${theme}-color" class="b3-text-field" type="color" value="${config[theme]}"${disabled}>
            </label>
        </div>`).join("")}
    </div>
</div>`;
};

export const mountCustomBackground = (element: HTMLElement) => {
    // element 为整个外观 Tab 容器，须限定在背景色设置块内查询，否则会误挂到其他颜色选择器上。
    const root = element.querySelector<HTMLElement>("[data-custombg]") || element;
    const config = normalizeCustomBackground(window.siyuan.config.appearance.customBackground);
    mountedConfigs.set(root, {config, revision: 0, editing: false});
    const preview = () => {
        const state = mountedConfigs.get(root);
        state.revision += 1;
        state.editing = true;
        setCustomBackground(config);
    };
    const save = () => {
        const state = mountedConfigs.get(root);
        const revision = state.revision;
        // 队列保存独立快照，后续编辑和推送不能修改已排队的配置。
        void appearanceConfigApi.patch("customBackground", normalizeCustomBackground(config), (data) => {
            if (state.revision === revision) {
                state.editing = false;
                syncCustomBackground(data.customBackground);
                setCustomBackground(config);
            }
        }).finally(() => {
            // 保存失败时解除编辑保护，恢复已确认的配置，后续推送仍可正常同步。
            if (state.revision === revision && state.editing) {
                state.editing = false;
                syncCustomBackground();
                setCustomBackground();
            }
        });
    };
    root.querySelector<HTMLSelectElement>("[data-custombg-mode]").addEventListener("change", (event) => {
        config.mode = (event.target as HTMLSelectElement).value as ICustomBackground["mode"];
        root.querySelector("[data-custombg-colors]").classList.toggle("fn__none", config.mode !== "custom");
        preview();
        save();
    });
    root.querySelectorAll<HTMLInputElement>("input[type=color]").forEach(input => {
        input.addEventListener("input", () => {
            const row = input.closest<HTMLElement>("[data-custombg-theme]");
            config[row.dataset.custombgTheme as "light" | "dark"] = input.value;
            preview();
        });
        input.addEventListener("change", save);
    });
};
