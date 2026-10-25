export interface ICustomBackground {
    mode: "theme" | "custom";
    light: string;
    dark: string;
}

export const normalizeCustomBackground = (value?: {mode?: string; light?: string; dark?: string}): ICustomBackground => {
    const normalizeColor = (color: string | undefined, fallback: string) =>
        /^#[\da-f]{6}$/i.test(color || "") ? color : fallback;
    return {
        mode: value?.mode === "custom" ? "custom" : "theme",
        light: normalizeColor(value?.light, "#ffffff"),
        dark: normalizeColor(value?.dark, "#1e1e1e"),
    };
};

export interface IBodyGradient {
    mode: "auto" | "custom" | "off";
    light: {color: string; opacity: number};
    dark: {color: string; opacity: number};
}

export const normalizeBodyGradient = (value?: {mode?: string; light?: IBodyGradient["light"]; dark?: IBodyGradient["dark"]}): IBodyGradient => {
    const normalizeColor = (color?: IBodyGradient["light"]) => ({
        color: /^#[\da-f]{6}$/i.test(color?.color || "") ? color.color : "#9d12e2",
        opacity: typeof color?.opacity === "number" && Number.isFinite(color.opacity) ?
            Math.max(0, Math.min(100, color.opacity)) : 12,
    });
    return {
        mode: value?.mode === "custom" || value?.mode === "off" ? value.mode : "auto",
        light: normalizeColor(value?.light),
        dark: normalizeColor(value?.dark),
    };
};

export const getBodyGradientImage = (value: Parameters<typeof normalizeBodyGradient>[0], theme: "light" | "dark"): string => {
    const config = normalizeBodyGradient(value);
    if (config.mode === "auto") {
        return "";
    }
    if (config.mode === "off") {
        return "none";
    }
    const {color, opacity} = config[theme];
    const rgb = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    return `radial-gradient(ellipse 45% 20% at 0% 0%, rgba(${rgb.join(", ")}, ${opacity / 100}) 0%, transparent 100%)`;
};
