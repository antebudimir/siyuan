import {showMessage} from "../../dialog/message";
import {countBlockWord} from "../../layout/status";
import {activeBlur} from "../../mobile/util/keyboardToolbar";
import {updateMultiSelectToolbar} from "../../mobile/util/multiSelectToolbar";
import {escapeHtml} from "../../util/escape";
import {isMobile} from "../../util/functions";
import {hideElements} from "../ui/hideElements";
import {selectAllLoadedBlocks} from "../wysiwyg/blockSelection";
import {hasUnloadedDocumentBlocks} from "./documentRange";
import {focusBlock} from "./selection";

// 全选时自动加载全文，耗时超过该值才显示加载通知，短加载保持无提示。
const LOAD_ALL_PROGRESS_DELAY = 300;

const loadingProtyles = new WeakSet<IProtyle>();

export const loadAllAndSelectBlocks = async (protyle: IProtyle) => {
    if (loadingProtyles.has(protyle)) {
        return false;
    }
    const rootID = protyle.block.rootID;
    const parentID = protyle.block.parentID;
    const editorElement = protyle.wysiwyg.element;
    const isCurrent = () => protyle.element.isConnected && protyle.block.rootID === rootID &&
        protyle.block.parentID === parentID && protyle.wysiwyg.element === editorElement;
    const dynamicLoad = !protyle.lite && !protyle.block.showAll && protyle.block.scroll &&
        !protyle.options.backlinkData;
    loadingProtyles.add(protyle);
    try {
        // 通知开关同时控制自动加载，关闭后只全选已加载的块。
        if (hasUnloadedDocumentBlocks(editorElement, dynamicLoad) &&
            window.siyuan.config.appearance.notifications?.selectAllIncompleteTip !== false) {
            const loaded = protyle.scroll.loadAll(protyle, {progressDelay: LOAD_ALL_PROGRESS_DELAY});
            if (!await loaded || !isCurrent()) {
                return false;
            }
        }
        hideElements(["toolbar"], protyle);
        if (isMobile()) {
            window.getSelection()?.removeAllRanges();
            activeBlur();
        } else {
            focusBlock(editorElement.firstElementChild);
        }
        const elements = selectAllLoadedBlocks(editorElement);
        countBlockWord(elements.map(item => item.getAttribute("data-node-id")), protyle);
        if (isMobile() && elements.length > 0) {
            if (protyle.toolbar.isMultiSelectMode()) {
                updateMultiSelectToolbar(protyle.toolbar.subElement, elements.length);
            } else {
                protyle.toolbar.showMultiSelectMode(protyle, elements[0] as HTMLElement);
            }
        }
        return true;
    } catch (error) {
        showMessage(escapeHtml(error.message), 7000, "error");
        return false;
    } finally {
        loadingProtyles.delete(protyle);
    }
};
