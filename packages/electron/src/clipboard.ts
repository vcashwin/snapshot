import { clipboard } from "electron";
import type { ClipboardResult } from "@ashwinvc/snapshot-core/types";

export type ElectronClipboardOptions = {
  /** Plain-text fallback stored alongside HTML. */
  plainText?: string;
};

/** Write HTML to the system clipboard using Electron's native API. */
export function writeHtmlToClipboard(
  html: string,
  options: ElectronClipboardOptions = {},
): ClipboardResult {
  try {
    if (options.plainText) {
      clipboard.write({ html, text: options.plainText });
    } else {
      clipboard.writeHTML(html);
    }
    return { status: "success" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Clipboard write failed.";
    return { status: "error", error: message };
  }
}

/** Read HTML previously written by snapshot (or any HTML clipboard payload). */
export function readHtmlFromClipboard(): string {
  return clipboard.readHTML();
}

/**
 * Creates a writeClipboard function compatible with useSnapshotCapture's
 * `writeClipboard` option.
 */
export function createElectronClipboardWriter(
  options: ElectronClipboardOptions = {},
) {
  return (html: string): ClipboardResult =>
    writeHtmlToClipboard(html, options);
}
