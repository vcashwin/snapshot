import { PICKER_ATTRIBUTE } from "./constants.js";
import { querySelectorAcrossShadowRoots } from "./selector.js";
import { createStylePropertyList } from "./styles.js";
import { serializeNode } from "./serialize-node.js";
import type { CaptureResult, SerializeOptions } from "./types.js";

/**
 * Serialize the DOM subtree matched by a picker selector into inline-styled HTML.
 */
export async function captureBySelector(
  selector: string,
  options: SerializeOptions = {},
): Promise<CaptureResult> {
  const doc = options.document ?? document;
  const element = querySelectorAcrossShadowRoots(selector, doc);

  if (!element) {
    return {
      status: "error",
      error: "Your selection could not be captured.",
    };
  }

  const styleProperties = createStylePropertyList(doc);
  const skippedHiddenCount = { value: 0 };
  const warmupDelay = options.warmupDelay ?? 500;

  const abortController = new AbortController();
  const externalSignal = options.signal;

  const onExternalAbort = () => abortController.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  const onEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      abortController.abort();
    }
  };

  doc.defaultView?.addEventListener("keydown", onEscape, { capture: true });

  try {
    const dryRun = await serializeNode(element, {
      styleProperties,
      dryRun: true,
      skippedHiddenCount,
    });

    const totalNodes = dryRun.processedNodes;

    options.onProgress?.({ processed: 0, total: totalNodes, percent: 0 });

    await new Promise<void>((resolve) => setTimeout(resolve, warmupDelay));

    const result = await serializeNode(element, {
      styleProperties,
      abortSignal: abortController.signal,
      onProgress: (count) => {
        if (totalNodes > 0) {
          options.onProgress?.({
            processed: count,
            total: totalNodes,
            percent: Math.min(Math.ceil((count / totalNodes) * 100), 100),
          });
        }
      },
      skippedHiddenCount,
    });

    if (abortController.signal.aborted) {
      return { status: "aborted" };
    }

    if (skippedHiddenCount.value > 0) {
      if (result.html === "") {
        return {
          status: "error",
          error: "Your selection could not be captured, try selecting something else.",
        };
      }
      return {
        status: "success",
        html: result.html,
        warning: "Some elements were unable to be captured.",
      };
    }

    return { status: "success", html: result.html };
  } finally {
    doc.defaultView?.removeEventListener("keydown", onEscape, { capture: true });
    externalSignal?.removeEventListener("abort", onExternalAbort);
    element.removeAttribute(PICKER_ATTRIBUTE);
  }
}
