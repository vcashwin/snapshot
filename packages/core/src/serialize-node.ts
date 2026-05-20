import {
  REMAP_TO_DIV_TAGS,
  SKIP_TAGS,
} from "./constants.js";
import { escapeAttr, escapeHtml } from "./escape.js";
import {
  extractComputedStyles,
  isCollapsedTransform,
  isInsideSvg,
  isSnapshotUiElement,
  pseudoContentText,
  stylesToString,
} from "./styles.js";
import { serializeTextNode } from "./text.js";
import type { NodeSerializeResult } from "./types.js";

type SerializeNodeContext = {
  styleProperties: string[];
  abortSignal?: AbortSignal;
  dryRun?: boolean;
  isRoot?: boolean;
  processedNodes?: number;
  onProgress?: (processed: number) => void;
  skippedHiddenCount?: { value: number };
};

export async function serializeNode(
  node: Node,
  context: SerializeNodeContext,
): Promise<NodeSerializeResult> {
  const {
    styleProperties,
    abortSignal,
    dryRun = false,
    isRoot = false,
    processedNodes = 0,
    onProgress,
    skippedHiddenCount,
  } = context;

  if (abortSignal?.aborted) {
    return { html: "", processedNodes: 0 };
  }

  if (!dryRun) {
    onProgress?.(processedNodes + 1);
  }

  if (!(node instanceof Element || node instanceof SVGElement)) {
    if (dryRun) return { html: "", processedNodes: 1 };
    if (node instanceof Text) {
      return { html: escapeHtml(serializeTextNode(node)), processedNodes: 1 };
    }
    return { html: "", processedNodes: 1 };
  }

  const tag = node.tagName.toLowerCase();
  const computed = getComputedStyle(node);
  const isPositioned = ["absolute", "fixed"].includes(computed.position);
  const parentDisplay = node.parentElement
    ? getComputedStyle(node.parentElement).display
    : "";
  const parentIsBlockLike = ["block", "inline-block"].includes(parentDisplay);
  const hasZeroSize =
    parseFloat(computed.height) === 0 || parseFloat(computed.width) === 0;
  const hasPadding =
    parseFloat(computed.paddingTop) > 0 ||
    parseFloat(computed.paddingRight) > 0 ||
    parseFloat(computed.paddingBottom) > 0 ||
    parseFloat(computed.paddingLeft) > 0;
  const isCollapsedBox =
    hasZeroSize && (isPositioned || parentIsBlockLike) && !hasPadding;
  const isDisplayNone = computed.display === "none";
  const parent =
    node.parentElement ??
    (node.parentNode instanceof ShadowRoot ? node.parentNode : null);
  const isInvisibleOpacity =
    computed.opacity === "0" &&
    (isPositioned || parent?.childElementCount === 1);
  const isUiElement = isSnapshotUiElement(node);
  const isSkippedTag = SKIP_TAGS.has(tag) || isUiElement;
  const isNotVisible = !node.checkVisibility();
  const countsAsPartiallyHidden =
    isNotVisible && !isDisplayNone && computed.contentVisibility !== "hidden";

  if (isCollapsedBox || isDisplayNone || isInvisibleOpacity || isSkippedTag || isNotVisible) {
    if (countsAsPartiallyHidden && !dryRun && skippedHiddenCount) {
      skippedHiddenCount.value += 1;
    }
    return { html: "", processedNodes: 1 };
  }

  let totalProcessed = 1;
  const childHtmlParts: string[] = [];
  let elementStyles: Record<string, string> = {};

  const canStyleSvg =
    !(node instanceof SVGElement) || node instanceof SVGGraphicsElement;

  if (!dryRun && canStyleSvg) {
    const beforeStyles = extractComputedStyles(node, {
      pseudo: "::before",
      styleProperties,
    });
    if (Object.keys(beforeStyles).length && !isCollapsedTransform(beforeStyles)) {
      const content = pseudoContentText(beforeStyles);
      delete beforeStyles.content;
      childHtmlParts.push(
        `<div style="${stylesToString(beforeStyles)}">${escapeHtml(content)}</div>`,
      );
    }
    elementStyles = extractComputedStyles(node, {
      isRoot,
      styleProperties,
    });
  }

  const attributes: Array<[string, string]> = node
    .getAttributeNames()
    .map((name) => [name, node.getAttribute(name) ?? ""]);

  const childNodes = node.shadowRoot
    ? Array.from(node.shadowRoot.childNodes)
    : Array.from(node.childNodes);

  for (const child of childNodes) {
    const nodesToSerialize: Node[] = [];

    if (child instanceof HTMLSlotElement) {
      nodesToSerialize.push(...child.assignedNodes({ flatten: true }));
    } else if (child instanceof SVGElement && child.tagName === "use") {
      const href =
        (child.getAttribute("href") || child.getAttribute("xlink:href"))?.replace(
          "#",
          "",
        ) ?? "";
      const root = child.getRootNode();
      const referenced =
        href && (root instanceof Document || root instanceof ShadowRoot)
          ? root.getElementById(href)
          : null;

      if (referenced) {
        if (["symbol", "svg"].includes(referenced.tagName)) {
          for (const attr of referenced.getAttributeNames()) {
            if (["id", "class", "style"].includes(attr)) continue;
            if (node.hasAttribute(attr)) continue;
            attributes.push([attr, referenced.getAttribute(attr) ?? ""]);
          }
          nodesToSerialize.push(...Array.from(referenced.childNodes));
        } else {
          nodesToSerialize.push(referenced);
        }
      }
    } else if (!(node instanceof HTMLSelectElement) && child) {
      nodesToSerialize.push(child);
    }

    for (const childNode of nodesToSerialize) {
      if (!dryRun) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }

      const result = await serializeNode(childNode, {
        ...context,
        dryRun,
        isRoot: false,
        processedNodes: processedNodes + totalProcessed,
      });

      totalProcessed += result.processedNodes;
      if (!dryRun) childHtmlParts.push(result.html);
    }
  }

  if (dryRun) {
    return { html: "", processedNodes: totalProcessed };
  }

  if (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  ) {
    const isInlineControl =
      node instanceof HTMLInputElement || node instanceof HTMLSelectElement;
    const placeholder =
      "placeholder" in node ? node.placeholder : undefined;
    const value =
      node instanceof HTMLSelectElement
        ? node.firstElementChild?.textContent
        : node.value;
    const displayText = placeholder || value;
    const fieldStyles: Record<string, string> = {
      height: "fit-content",
      width: "100%",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "text-wrap-mode": "nowrap",
    };

    if (value) {
      childHtmlParts.push(
        `<div style="${stylesToString(fieldStyles)}">${node.value}</div>`,
      );
    } else if (placeholder) {
      const placeholderStyles = extractComputedStyles(node, {
        pseudo: "::placeholder",
        styleProperties,
      });
      Object.assign(placeholderStyles, fieldStyles);
      childHtmlParts.push(
        `<div style="${stylesToString(placeholderStyles)}">${placeholder}</div>`,
      );
    }

    if (displayText && isInlineControl) {
      elementStyles.display = elementStyles.display?.includes("inline")
        ? "inline-flex"
        : "flex";
      elementStyles["align-items"] = "center";
    }
  }

  const afterStyles = extractComputedStyles(node, {
    pseudo: "::after",
    styleProperties,
  });
  if (Object.keys(afterStyles).length && !isCollapsedTransform(afterStyles)) {
    const content = pseudoContentText(afterStyles);
    delete afterStyles.content;
    childHtmlParts.push(
      `<div style="${stylesToString(afterStyles)}">${escapeHtml(content)}</div>`,
    );
  }

  const outputAttributes: Array<[string, string]> = [];

  if (node instanceof HTMLImageElement) {
    outputAttributes.push(["src", node.src]);
    if (!elementStyles.width && !elementStyles.height) {
      elementStyles.width = computed.width;
      elementStyles.height = computed.height;
    }
  }

  if (node instanceof HTMLBRElement) {
    return { html: "<br>", processedNodes: totalProcessed };
  }

  const outputTag = REMAP_TO_DIV_TAGS.has(tag) ? "div" : tag;

  if (outputTag !== tag) {
    outputAttributes.push(["paper-snapshot-original-tag", node.tagName]);
  }

  if (tag === "input") {
    outputAttributes.push(["layer-name", "Input"]);
  } else if (tag === "textarea") {
    outputAttributes.push(["layer-name", "Text Area"]);
  }

  if (node instanceof SVGElement) {
    if (elementStyles.width === undefined || elementStyles.width === "auto") {
      elementStyles.width = computed.width;
    }
    if (elementStyles.height === undefined || elementStyles.height === "auto") {
      elementStyles.height = computed.height;
    }

    for (const [name, value] of attributes) {
      if (["class", "style", "display", "overflow"].includes(name) || !value) {
        continue;
      }

      let resolved = value;
      if (["fill", "stroke", "color"].includes(name)) {
        if (value.startsWith("var(")) {
          const mapped = elementStyles[name];
          if (mapped) resolved = mapped;
        } else if (value.toLowerCase() === "currentcolor") {
          const mapped = elementStyles[name] ?? elementStyles.color;
          if (mapped) resolved = mapped;
        }
      }

      outputAttributes.push([name, resolved]);
      if (!["width", "height"].includes(name)) {
        delete elementStyles[name];
      }
    }
  }

  if (Object.keys(elementStyles).length > 0) {
    if (elementStyles.width || elementStyles.height) {
      elementStyles.width ??= "auto";
      elementStyles.height ??= "auto";
    }
    outputAttributes.push(["style", stylesToString(elementStyles)]);
  }

  const children = childHtmlParts.join("");
  const shouldWrap =
    isInsideSvg(node) ||
    (node.checkVisibility() && elementStyles.display !== "contents");

  if (!shouldWrap) {
    return { html: children, processedNodes: totalProcessed };
  }

  const attrString = outputAttributes
    .map(([name, value]) => `${name}="${escapeAttr(value)}"`)
    .join(" ");

  return {
    html: `<${outputTag}${attrString ? ` ${attrString}` : ""}>${children}</${outputTag}>`,
    processedNodes: totalProcessed,
  };
}
