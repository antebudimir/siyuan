import {IBlockRefStyle, normalizeBlockRefStyle, setBlockRefStyle} from "../../util/blockRefStyle";
import {appearanceConfigApi} from "./appearanceRuntime";

const mountedConfigs = new WeakMap<HTMLElement, {
    config: IBlockRefStyle;
    revision: number;
    editing: boolean;
}>();

export const syncBlockRefStyle = (style = window.siyuan.config.appearance.blockRefStyle) => {
    document.querySelectorAll<HTMLElement>("[data-blockref-style]").forEach(element => {
        const mountedConfig = mountedConfigs.get(element);
        // 保留尚未确认的本地编辑，避免较早的推送覆盖连续切换或拖动中的数值。
        const config = mountedConfig?.editing ? mountedConfig.config : normalizeBlockRefStyle(style);
        if (mountedConfig && !mountedConfig.editing) {
            Object.assign(mountedConfig.config, config);
        }
        if (mountedConfig?.editing) {
            setBlockRefStyle(config);
        }
        element.querySelector<HTMLSelectElement>("[data-blockref-mode]").value = config.mode;
        element.querySelector("[data-blockref-colors]").classList.toggle("fn__none", config.mode === "off");
        element.querySelector<HTMLSelectElement>("[data-blockref-color-mode]").value =
            config.borderColor === "auto" ? "auto" : "custom";
        element.querySelector("[data-blockref-color-picker]").classList.toggle("fn__none", config.borderColor === "auto");
        element.querySelector<HTMLInputElement>("input[type=color]").value =
            config.borderColor === "auto" ? "#9d12e2" : config.borderColor;
        element.querySelectorAll<HTMLElement>("[data-blockref-slider]").forEach(row => {
            const slider = row.querySelector<HTMLInputElement>("input[type=range]");
            slider.value = String(config[row.dataset.blockrefSlider as "borderWidth" | "radius" | "paddingX" | "paddingY"]);
            row.querySelector("output").textContent = `${slider.value}px`;
        });
    });
};

export const genBlockRefStyleHtml = () => {
    const config = normalizeBlockRefStyle(window.siyuan.config.appearance.blockRefStyle);
    const lang = window.siyuan.languages;
    const disabled = window.siyuan.config.readonly ? " disabled" : "";
    const sliders: Array<[keyof Pick<IBlockRefStyle, "borderWidth" | "radius" | "paddingX" | "paddingY">, number, number, string]> = [
        ["borderWidth", 0, 4, lang.blockRefStyleBorderWidth],
        ["radius", 0, 12, lang.blockRefStyleRadius],
        ["paddingX", 0, 12, lang.blockRefStylePaddingX],
        ["paddingY", 0, 12, lang.blockRefStylePaddingY],
    ];
    return `<div class="b3-label config-item" data-blockref-style>
    <div class="fn__flex">
        <div class="fn__flex-1 config-item__main">
            <div class="config-name">${lang.blockRefStyle}</div>
            <div class="b3-label__text">${lang.blockRefStyleTip}</div>
        </div>
        <span class="fn__space"></span>
        <select class="b3-select fn__flex-center fn__size200" data-blockref-mode aria-label="${lang.blockRefStyle}"${disabled}>
            ${[["border", lang.blockRefStyleBorder], ["off", lang.disable]].map(([value, label]) =>
        `<option value="${value}"${config.mode === value ? " selected" : ""}>${label}</option>`).join("")}
        </select>
    </div>
    <div data-blockref-colors class="${config.mode === "off" ? "fn__none" : ""}">
        <div class="fn__flex config-blockref-style">
            <label class="fn__flex-1" for="blockRefStyle-color-mode">${lang.blockRefStyleBorderColor}</label>
            <select id="blockRefStyle-color-mode" class="b3-select fn__flex-center fn__size200" data-blockref-color-mode${disabled}>
                ${[["auto", lang.blockRefStyleBorderColorAuto], ["custom", lang.custom]].map(([value, label]) =>
        `<option value="${value}"${(config.borderColor === "auto" ? "auto" : "custom") === value ? " selected" : ""}>${label}</option>`).join("")}

            </select>
            <span class="fn__space"></span>
            <span data-blockref-color-picker class="${config.borderColor === "auto" ? "fn__none" : ""}">
                <input class="b3-text-field" type="color" value="${config.borderColor === "auto" ? "#9d12e2" : config.borderColor}"${disabled} aria-label="${lang.blockRefStyleBorderColor}">
            </span>
        </div>
        ${sliders.map(([key, min, max, label]) => `<div class="fn__flex config-blockref-style" data-blockref-slider="${key}">
            <label class="fn__flex-1" for="blockRefStyle-${key}">${label}</label>
            <input id="blockRefStyle-${key}" class="b3-slider fn__size200" type="range" min="${min}" max="${max}" step="1" value="${config[key]}"${disabled}>
            <span class="fn__space"></span>
            <output for="blockRefStyle-${key}">${config[key]}px</output>
        </div>`).join("")}
    </div>
</div>`;
};


export const mountBlockRefStyle = (element: HTMLElement) => {
    // element 为整个外观 Tab 容器，须限定在块引用设置块内查询，否则会误挂到主题背景等其他颜色选择器上。
    const root = element.querySelector<HTMLElement>("[data-blockref-style]") || element;
    const config = normalizeBlockRefStyle(window.siyuan.config.appearance.blockRefStyle);
    let revision = 0;
    mountedConfigs.set(root, {config, revision, editing: false});

    // 队列保存独立快照，后续编辑和推送不能修改已排队的配置。
    const save = () => {
        revision += 1;
        const state = mountedConfigs.get(root);
        state.revision = revision;
        state.editing = true;
        void appearanceConfigApi.patch("blockRefStyle", normalizeBlockRefStyle(config), (data) => {
            if (state.revision === revision) {
                state.editing = false;
                syncBlockRefStyle(data.blockRefStyle);
                setBlockRefStyle(config);
            }
        }).finally(() => {
            // 保存失败时解除编辑保护，恢复已确认的配置，后续推送仍可正常同步。
            if (state.revision === revision && state.editing) {
                state.editing = false;
                syncBlockRefStyle();
                setBlockRefStyle();
            }
        });
    };

    root.querySelector<HTMLSelectElement>("[data-blockref-mode]").addEventListener("change", (event) => {
        config.mode = (event.target as HTMLSelectElement).value as IBlockRefStyle["mode"];
        root.querySelector("[data-blockref-colors]").classList.toggle("fn__none", config.mode === "off");
        save();
    });
    root.querySelector<HTMLSelectElement>("[data-blockref-color-mode]").addEventListener("change", (event) => {
        const mode = (event.target as HTMLSelectElement).value;
        config.borderColor = mode === "auto" ? "auto" :
            root.querySelector<HTMLInputElement>("input[type=color]").value;
        root.querySelector("[data-blockref-color-picker]").classList.toggle("fn__none", mode === "auto");
        save();
    });
    root.querySelector<HTMLInputElement>("input[type=color]").addEventListener("input", (event) => {
        if (config.borderColor !== "auto") {
            config.borderColor = (event.target as HTMLInputElement).value;
            revision += 1;
            const state = mountedConfigs.get(root);
            state.revision = revision;
            state.editing = true;
            setBlockRefStyle(config);
        }
    });
    root.querySelector<HTMLInputElement>("input[type=color]").addEventListener("change", () => {
        if (config.borderColor !== "auto") {
            save();
        }
    });
    root.querySelectorAll<HTMLElement>("[data-blockref-slider]").forEach(row => {
        const key = row.dataset.blockrefSlider as "borderWidth" | "radius" | "paddingX" | "paddingY";
        row.querySelector<HTMLInputElement>("input[type=range]").addEventListener("input", (event) => {
            config[key] = Number((event.target as HTMLInputElement).value);
            row.querySelector("output").textContent = `${config[key]}px`;
            revision += 1;
            const state = mountedConfigs.get(root);
            state.revision = revision;
            state.editing = true;
            setBlockRefStyle(config);
        });
        row.querySelector<HTMLInputElement>("input[type=range]").addEventListener("change", save);
    });
};
