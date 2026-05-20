import type { WebContents } from "electron";
import type { CaptureAndCopyOptions } from "@ashwinvc/snapshot-core/capture";
import type { CaptureResult } from "@ashwinvc/snapshot-core/types";
import { writeHtmlToClipboard } from "./clipboard.js";

declare global {
  interface Window {
    __snapshot?: {
      captureAndCopy: (
        options?: CaptureAndCopyOptions,
      ) => Promise<CaptureResult & { wrappedHtml?: string }>;
    };
  }
}

export type WebContentsCaptureOptions = CaptureAndCopyOptions & {
  webContents: WebContents;
  /** When true (default), write wrapped HTML via Electron clipboard after guest capture. */
  copyToClipboard?: boolean;
};

/**
 * Run capture inside a guest page that exposed `window.__snapshot` via preload.
 *
 * Preload example:
 * ```ts
 * import { captureAndCopy } from '@ashwinvc/snapshot-core/capture';
 * import { wrapForPaper } from '@ashwinvc/snapshot-core/wrap';
 * contextBridge.exposeInMainWorld('__snapshot', {
 *   captureAndCopy: async (options) => {
 *     const result = await captureAndCopy({ ...options, copyToClipboard: false });
 *     if (result.status !== 'success') return result;
 *     return { ...result, wrappedHtml: wrapForPaper(result.html) };
 *   },
 * });
 * ```
 */
export async function captureFromWebContents(
  options: WebContentsCaptureOptions,
): Promise<CaptureResult & { wrappedHtml?: string }> {
  const { webContents, copyToClipboard = true, ...captureOptions } = options;

  const result = await webContents.executeJavaScript(
    `window.__snapshot?.captureAndCopy(${JSON.stringify({
      ...captureOptions,
      copyToClipboard: false,
    })})`,
    true,
  );

  if (
    result?.status === "success" &&
    copyToClipboard &&
    result.wrappedHtml
  ) {
    writeHtmlToClipboard(result.wrappedHtml);
  }

  return result;
}
