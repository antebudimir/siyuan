export interface IBlockRefStyle {
    mode: string;
    borderWidth: number;
    radius: number;
    paddingX: number;
    paddingY: number;
    borderColor: string; // auto：跟随主题引用色，十六进制 RGB：自定义颜色
}

export const normalizeBlockRefStyle = (value?: Partial<IBlockRefStyle>): IBlockRefStyle => {
    // 负数或非法数值回退当前默认外观，保证旧工作空间补全后与既有渲染一致。
    const clamp = (num: unknown, fallback: number) =>
        typeof num === "number" && Number.isFinite(num) && num >= 0 ? Math.floor(num) : fallback;
    return {
        mode: value?.mode === "off" ? "off" : "border",
        borderWidth: clamp(value?.borderWidth, 1),
        radius: clamp(value?.radius, 4),
        paddingX: clamp(value?.paddingX, 4),
        paddingY: clamp(value?.paddingY, 0),
        borderColor: /^#[\da-f]{6}$/i.test(value?.borderColor || "") ? value.borderColor : "auto",
    };
};

// measureBlockRefPaddingShift 采样编辑器字体的字形墨迹分布，计算让引用文字在边框内视觉垂直居中的上下内边距偏移（em）。
// 行内元素边框绘制在字体盒与对称半行距之外，上下留白的不对称完全来自字体度量（下伸部与顶部留白的差异），不同字体方向和幅度都不同，因此运行时测量。
const measureBlockRefPaddingShift = (paddingY: number): number => {
    const rootStyle = getComputedStyle(document.documentElement);
    // 与 generated 样式中编辑器正文的字体栈保持一致；变量值可能含换行等原始空白，须先归一化，否则 canvas 字体赋值会静默失败。
    const family = ["--b3-font-family-emoji-reset", "--b3-font-family-editor", "--b3-font-family"]
        .map((name) => rootStyle.getPropertyValue(name) || getComputedStyle(document.documentElement).fontFamily)
        .join(",");
    const fontSize = window.siyuan.config.editor.fontSize || 16;
    const candidates = [`${fontSize}px ${family}`, `${fontSize}px ${getComputedStyle(document.body).fontFamily}`];
    let measured = null;
    for (const candidate of candidates) {
        const context = document.createElement("canvas").getContext("2d");
        if (!context) {
            return 0;
        }
        const target = candidate.replace(/\s+/g, " ").trim();
        context.font = target;
        // font 属性赋值失败时不会抛错而是保持原值，须显式校验，避免用回退字体度量出错误偏移。
        if (context.font !== target) {
            continue;
        }
        const metrics = context.measureText("Hg");
        if ((metrics.fontBoundingBoxAscent || 0) + (metrics.fontBoundingBoxDescent || 0) > 0) {
            measured = metrics;
            break;
        }
    }
    if (!measured) {
        return 0;
    }
    const metrics = measured;
    // 视觉居中为正：文字上方应留白略大，参考行内按钮的观感；CSS 中 padding-top 加 shift、padding-bottom 减 shift，
    // 故补偿方向取下方富余减上方富余的一半；偏移不得吃掉用户设置的内边距。
    const above = (metrics.fontBoundingBoxAscent || 0) - (metrics.actualBoundingBoxAscent || 0);
    const below = (metrics.fontBoundingBoxDescent || 0) - (metrics.actualBoundingBoxDescent || 0);
    let shift = (below - above) / 2;
    // 纯度量平均仍显头重脚轻，按观感放大补偿幅度（仍受内边距钳制）。
    // 纯度量平均观感仍偏上不足，叠加固定的光学偏置（px），并放宽上方预算：顶部最多可比 paddingY 多 4px，底部不低于 0。
    shift = (below - above) / 2 + 2;
    shift = Math.max(-paddingY, Math.min(paddingY + 4, shift));
    return shift / fontSize;
};

// setBlockRefStyle 将块引用描边偏好写入根元素 CSS 变量；关闭模式还原为纯文本呈现。
let blockRefStyleToken = 0;
export const setBlockRefStyle = (style = window.siyuan.config.appearance.blockRefStyle) => {
    const config = normalizeBlockRefStyle(style);
    const htmlElement = document.documentElement;
    const off = config.mode === "off";
    htmlElement.style.setProperty("--b3-protyle-inline-blockref-border-width", off ? "0px" : `${config.borderWidth}px`);
    htmlElement.style.setProperty("--b3-protyle-inline-blockref-radius", off ? "0px" : `${config.radius}px`);
    htmlElement.style.setProperty("--b3-protyle-inline-blockref-padding-x", off ? "0px" : `${config.paddingX}px`);
    htmlElement.style.setProperty("--b3-protyle-inline-blockref-padding-y", off ? "0px" : `${config.paddingY}px`);
    const token = ++blockRefStyleToken;
    const applyPaddingShift = () => {
        if (token !== blockRefStyleToken) {
            return;
        }
        htmlElement.style.setProperty("--b3-protyle-inline-blockref-padding-shift",
            off || config.paddingY === 0 ? "0em" : `${measureBlockRefPaddingShift(config.paddingY).toFixed(4)}em`);
    };
    applyPaddingShift();
    if (!off && config.paddingY > 0) {
        // 字体异步加载会改变度量：ready 可能早于加载开始就兑现，故同时监听 loadingdone，每次字体加载完成都重新测量；旧调用通过令牌作废。
        document.fonts.ready.then(applyPaddingShift);
        document.fonts.addEventListener("loadingdone", applyPaddingShift);
    }
    if (!off && config.borderColor !== "auto") {
        htmlElement.style.setProperty("--b3-protyle-inline-blockref-color", config.borderColor);
    } else {
        htmlElement.style.removeProperty("--b3-protyle-inline-blockref-color");
    }
};
