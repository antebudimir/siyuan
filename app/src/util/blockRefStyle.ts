export interface IBlockRefStyle {
	mode: string;
	borderWidth: number;
	radius: number;
	paddingX: number;
	paddingY: number;
	borderColor: string; // auto：跟随主题引用色，十六进制 RGB：自定义颜色
}

export const normalizeBlockRefStyle = (
	value?: Partial<IBlockRefStyle>,
): IBlockRefStyle => {
	// 负数或非法数值回退当前默认外观，保证旧工作空间补全后与既有渲染一致。
	const clamp = (num: unknown, fallback: number) =>
		typeof num === 'number' && Number.isFinite(num) && num >= 0
			? Math.floor(num)
			: fallback;
	return {
		mode: value?.mode === 'off' ? 'off' : 'border',
		borderWidth: clamp(value?.borderWidth, 1),
		radius: clamp(value?.radius, 4),
		paddingX: clamp(value?.paddingX, 7),
		paddingY: clamp(value?.paddingY, 0),
		borderColor: /^#[\da-f]{6}$/i.test(value?.borderColor || '')
			? value.borderColor
			: 'auto',
	};
};

// getBlockRefPaddingShift 返回让引用文字在边框内视觉垂直居中的上下内边距偏移（em）
// 0
const getBlockRefPaddingShift = (): number => 0;

// setBlockRefStyle 将块引用描边偏好写入根元素 CSS 变量；关闭模式还原为纯文本呈现。
export const setBlockRefStyle = (
	style = window.siyuan.config.appearance.blockRefStyle,
) => {
	const config = normalizeBlockRefStyle(style);
	const htmlElement = document.documentElement;
	const off = config.mode === 'off';
	htmlElement.style.setProperty(
		'--b3-protyle-inline-blockref-border-width',
		off ? '0px' : `${config.borderWidth}px`,
	);
	htmlElement.style.setProperty(
		'--b3-protyle-inline-blockref-radius',
		off ? '0px' : `${config.radius}px`,
	);
	htmlElement.style.setProperty(
		'--b3-protyle-inline-blockref-padding-x',
		off ? '0px' : `${config.paddingX}px`,
	);
	htmlElement.style.setProperty(
		'--b3-protyle-inline-blockref-padding-y',
		off ? '0px' : `${config.paddingY}px`,
	);
	htmlElement.style.setProperty(
		'--b3-protyle-inline-blockref-padding-shift',
		off ? '0em' : `${getBlockRefPaddingShift()}em`,
	);
	if (!off && config.borderColor !== 'auto') {
		htmlElement.style.setProperty(
			'--b3-protyle-inline-blockref-color',
			config.borderColor,
		);
	} else {
		htmlElement.style.removeProperty('--b3-protyle-inline-blockref-color');
	}
};
