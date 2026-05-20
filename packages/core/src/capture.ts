import { copyHtmlToClipboard } from "./clipboard/browser.js";
import { captureBySelector } from "./serialize.js";
import { runElementPicker } from "./picker.js";
import { wrapForPaper } from "./wrap.js";
import type {
  CaptureOptions,
  CaptureResult,
  ClipboardResult,
  CopyHtmlOptions,
} from "./types.js";

export { copyHtmlToClipboard } from "./clipboard/browser.js";

/**
 * Pick an element interactively and serialize its subtree.
 */
export async function captureSelection(
  options: CaptureOptions = {},
): Promise<CaptureResult> {
  const selector =
    options.selector ?? (await runElementPicker(options));

  if (!selector) {
    return { status: "cancelled" };
  }

  return captureBySelector(selector, options);
}

export type CaptureAndCopyOptions = CaptureOptions &
  CopyHtmlOptions & {
    /** Write serialized HTML to the system clipboard. Default true. */
    copyToClipboard?: boolean;
  };

export type CaptureAndCopyResult =
  | (Extract<CaptureResult, { status: "success" }> & {
      clipboard: ClipboardResult;
    })
  | CaptureResult;

/**
 * End-to-end: pick → serialize → optionally copy to clipboard.
 */
export async function captureAndCopy(
  options: CaptureAndCopyOptions = {},
): Promise<CaptureAndCopyResult> {
  const result = await captureSelection(options);

  if (result.status !== "success") {
    return result;
  }

  const shouldCopy = options.copyToClipboard ?? true;
  if (!shouldCopy) {
    return result;
  }

  const html = options.wrap === false ? result.html : wrapForPaper(result.html);
  const clipboard = await copyHtmlToClipboard(html);

  return { ...result, clipboard };
}
