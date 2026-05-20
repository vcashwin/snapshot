import {
  PICKER_ATTRIBUTE,
  PICKER_BLANKET_ID,
  PICKER_OUTLINE_ID,
  TRANSFER_MESSAGE,
} from "./constants.js";
import { isSnapshotUiElement } from "./styles.js";
import type { PickerOptions } from "./types.js";

type PickerPhase =
  | "wait"
  | "continue"
  | "move-to-child-document"
  | "clear-outline"
  | "completing"
  | "complete";

function listenForMessage(
  message: string,
  handler: (event: MessageEvent) => void,
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.data === message && event.source !== window) {
      handler(event);
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

function broadcastMessage(
  message: string,
  childFrames: Window[],
  phase: PickerPhase,
  direction: "both" | "children" | "parent" = "both",
): void {
  if (phase === "complete") return;

  if (direction === "children" || direction === "both") {
    for (const frame of childFrames) {
      frame.postMessage(message, "*");
    }
  }

  if (direction === "parent" || direction === "both") {
    window.parent.postMessage(message, "*");
  }
}

function filterHitTargets(
  elements: Element[],
  excludedRoots: Element[],
): HTMLElement[] {
  return elements.filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      !excludedRoots.includes(element) &&
      !isSnapshotUiElement(element),
  );
}

function getParentElement(element: Element): HTMLElement | null {
  if (element.parentElement) return element.parentElement;
  const parent = element.parentNode;
  if (parent instanceof ShadowRoot && parent.host instanceof HTMLElement) {
    return parent.host;
  }
  return null;
}

function findVisibleParent(element: Element): HTMLElement | null {
  const parent = getParentElement(element);
  if (
    parent &&
    parent !== document.documentElement &&
    parent.checkVisibility() &&
    parent.clientWidth &&
    parent.clientHeight &&
    !isSnapshotUiElement(parent)
  ) {
    return parent;
  }
  return parent ? findVisibleParent(parent) : null;
}

function findFirstVisibleChild(element: Element): HTMLElement | null {
  let sibling = element.nextElementSibling;
  while (sibling) {
    if (
      sibling instanceof HTMLElement &&
      sibling.checkVisibility() &&
      sibling.clientWidth &&
      sibling.clientHeight &&
      !isSnapshotUiElement(sibling)
    ) {
      return sibling;
    }
    sibling = sibling.nextElementSibling;
  }

  for (const child of Array.from(element.children)) {
    if (
      child instanceof HTMLElement &&
      child.checkVisibility() &&
      child.clientWidth &&
      child.clientHeight &&
      !isSnapshotUiElement(child)
    ) {
      return child;
    }
  }

  return null;
}

/**
 * Interactive element picker. Returns a unique CSS selector for the chosen element,
 * or null when cancelled.
 */
export function runElementPicker(
  options: PickerOptions = {},
): Promise<string | null> {
  const doc = options.document ?? document;
  const win = doc.defaultView ?? window;

  const pointer = { x: 0, y: 0 };
  const excludedRoots = [doc.body, doc.documentElement];
  const parentStack: Element[] = [];
  const childStack: Element[] = [];
  const childFrames: Window[] = [];

  const blanket = doc.createElement("div");
  blanket.id = PICKER_BLANKET_ID;
  blanket.style.position = "fixed";
  blanket.style.inset = "0";
  blanket.style.zIndex = "2147483646";
  blanket.style.overflow = "hidden";

  const outlineLayer = doc.createElement("div");
  outlineLayer.id = PICKER_OUTLINE_ID;
  outlineLayer.style.position = "fixed";
  outlineLayer.style.inset = "0";
  outlineLayer.style.overflow = "hidden";
  outlineLayer.style.pointerEvents = "none";
  outlineLayer.style.zIndex = "2147483645";

  const outline = doc.createElement("div");
  outline.style.position = "absolute";
  outline.style.border = "2px solid oklch(0.7 0.15 258)";
  outline.style.boxSizing = "border-box";
  outline.style.top = "0";
  outline.style.left = "0";
  outlineLayer.appendChild(outline);

  let highlighted: Element | null = null;
  let inputMode: "mouse" | "keyboard" = "mouse";
  let phase: PickerPhase = "wait";

  const resolveHitTarget = (): Element | null => {
    const visited = new Set<Document | ShadowRoot>();
    let root: Document | ShadowRoot = doc;
    let lastMatch: Element | undefined;

    while (!visited.has(root)) {
      visited.add(root);
      const hit = filterHitTargets(
        root.elementsFromPoint(pointer.x, pointer.y),
        excludedRoots,
      ).at(0);

      if (!hit || hit === lastMatch) break;
      lastMatch = hit;
      if (!hit.shadowRoot) break;
      root = hit.shadowRoot;
    }

    return lastMatch ?? null;
  };

  const renderOutline = () => {
    if (phase === "complete") return;

    if (phase === "completing") {
      outline.style.opacity = "0";
      return;
    }

    if (phase === "wait") {
      outline.style.opacity = "0";
      highlighted = null;
      return;
    }

    if (phase === "move-to-child-document") {
      outline.style.opacity = "0";
      blanket.style.pointerEvents = "none";
      phase = "continue";
      highlighted = null;
    }

    if (phase === "clear-outline") {
      outline.style.opacity = "0";
      phase = "continue";
      highlighted = null;
    }

    if (
      doc.hasFocus() === false ||
      doc.activeElement === null ||
      doc.activeElement.tagName === "IFRAME"
    ) {
      win.focus();
    }

    const target = inputMode === "keyboard" ? highlighted : resolveHitTarget();

    if (!target) {
      outline.style.opacity = "0";
      return;
    }

    if (target.tagName === "IFRAME") {
      phase = "move-to-child-document";
      return;
    }

    blanket.style.pointerEvents = "auto";
    const rect = target.getBoundingClientRect();
    outline.style.opacity = "1";
    outline.style.translate = `${rect.left}px ${rect.top}px`;
    outline.style.width = `${rect.width}px`;
    outline.style.height = `${rect.height}px`;
    highlighted = target;

    options.onHighlight?.({ element: target, rect });
    broadcastMessage(TRANSFER_MESSAGE.HIGHLIGHTED, childFrames, phase, "children");
  };

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (phase === "wait") phase = "continue";
  };

  const onPointerMoveCapture = () => {
    inputMode = "mouse";
    parentStack.length = 0;
    childStack.length = 0;
  };

  win.addEventListener("pointermove", onPointerMove);
  doc.body.appendChild(blanket);
  doc.body.appendChild(outlineLayer);

  const rafLoop = () => {
    renderOutline();
    if (phase !== "complete") {
      requestAnimationFrame(rafLoop);
    }
  };
  requestAnimationFrame(rafLoop);

  return new Promise<string | null>((resolve) => {
    const cleanups: Array<() => void> = [];

    const finish = (selector: string | null) => {
      setTimeout(() => {
        blanket.remove();
        outline.remove();
        outlineLayer.remove();
      }, 21);

      for (const cleanup of cleanups) cleanup();
      win.removeEventListener("pointermove", onPointerMoveCapture);
      broadcastMessage(TRANSFER_MESSAGE.COMPLETED, childFrames, phase);
      phase = "complete";
      resolve(selector);
    };

    const removeInteractionListeners = () => {
      win.removeEventListener("click", onClick, { capture: true });
      win.removeEventListener("pointerdown", onPointerDown, { capture: true });
      win.removeEventListener("pointermove", onPointerMoveCapture, {
        capture: true,
      });
      win.removeEventListener("keydown", onKeyDown, { capture: true });
    };

    const onPointerDown = (event: Event) => {
      if (phase !== "complete" && phase !== "completing") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onClick = (event: Event) => {
      event.stopPropagation();
      removeInteractionListeners();

      phase = "completing";

      if (highlighted) {
        const stamp = Date.now();
        highlighted.setAttribute(PICKER_ATTRIBUTE, `${stamp}`);
        finish(`[${PICKER_ATTRIBUTE}="${stamp}"]`);
      } else {
        finish(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (options.signal?.aborted) {
        removeInteractionListeners();
        finish(null);
        return;
      }

      if (highlighted && event.key.startsWith("Arrow")) {
        event.preventDefault();
        event.stopPropagation();
        inputMode = "keyboard";

        switch (event.key) {
          case "ArrowUp": {
            if (childStack.length > 0) {
              highlighted = childStack.pop()!;
            } else {
              const parent = findVisibleParent(highlighted);
              if (parent) {
                parentStack.push(highlighted);
                highlighted = parent;
              }
            }
            break;
          }
          case "ArrowDown": {
            if (parentStack.length > 0) {
              highlighted = parentStack.pop()!;
            } else {
              const firstChild = highlighted.shadowRoot
                ? highlighted.shadowRoot.firstElementChild
                : highlighted.children[0];

              if (firstChild instanceof HTMLElement) {
                const visibleChild = findFirstVisibleChild(firstChild);
                if (visibleChild) {
                  childStack.push(highlighted);
                  highlighted = visibleChild;
                }
              }
            }
            break;
          }
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        removeInteractionListeners();
        finish(null);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onClick(event);
      }
    };

    const onExternalAbort = () => {
      removeInteractionListeners();
      finish(null);
    };

    options.signal?.addEventListener("abort", onExternalAbort, { once: true });

    cleanups.push(
      listenForMessage(TRANSFER_MESSAGE.COMPLETED, () => {
        removeInteractionListeners();
        finish(null);
      }),
      listenForMessage(TRANSFER_MESSAGE.HIGHLIGHTED, () => {
        phase = "wait";
      }),
      listenForMessage(TRANSFER_MESSAGE.REGISTER_CHILD, (event) => {
        if (event.source && event.source instanceof Window) {
          childFrames.push(event.source);
        }
      }),
      () => options.signal?.removeEventListener("abort", onExternalAbort),
    );

    win.addEventListener("click", onClick, { capture: true });
    win.addEventListener("pointerdown", onPointerDown, { capture: true });
    win.addEventListener("pointermove", onPointerMoveCapture, { capture: true });
    win.addEventListener("keydown", onKeyDown, { capture: true });

    broadcastMessage(
      TRANSFER_MESSAGE.REGISTER_CHILD,
      childFrames,
      phase,
      "parent",
    );
  });
}
