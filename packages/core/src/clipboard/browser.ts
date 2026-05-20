import { copyHtmlViaCopyEvent } from "./copy-via-event.js";
import type { ClipboardResult } from "../types.js";

/** Copy HTML to the clipboard using the best available browser API. */
export async function copyHtmlToClipboard(
  html: string,
): Promise<ClipboardResult> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return { status: "success" };
    } catch {
      // Fall through to execCommand path.
    }
  }

  return copyHtmlViaCopyEvent(html);
}

export { copyHtmlViaCopyEvent } from "./copy-via-event.js";
