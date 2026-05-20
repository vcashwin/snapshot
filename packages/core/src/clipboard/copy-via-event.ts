import type { ClipboardResult } from "../types.js";

/**
 * Write HTML to the clipboard using the copy event + execCommand fallback.
 * Same technique as the Paper Snapshot Chrome extension offscreen document.
 */
export function copyHtmlViaCopyEvent(html: string): ClipboardResult {
  const container = document.createElement("div");
  container.contentEditable = "true";
  container.textContent = " ";
  document.body.appendChild(container);

  const selection = window.getSelection();
  if (!selection) {
    container.remove();
    return {
      status: "error",
      error: "Your browser blocked writing to clipboard. Refresh and try again.",
    };
  }

  const range = document.createRange();
  range.selectNodeContents(container);
  selection.removeAllRanges();
  selection.addRange(range);

  const onCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/html", html);
  };

  document.addEventListener("copy", onCopy);

  let success = false;
  try {
    success = document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", onCopy);
    selection.removeAllRanges();
    container.remove();
  }

  if (!success) {
    return {
      status: "error",
      error: "Your browser blocked writing to clipboard. Refresh and try again.",
    };
  }

  return { status: "success" };
}
