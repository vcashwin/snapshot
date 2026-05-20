/** Attribute stamped on the picked element to build a unique selector. */
export const PICKER_ATTRIBUTE = "data-paper-element-picker";

/** Wrapper element Paper desktop recognizes on paste. */
export const PAPER_HTML_WRAPPER = "x-paper-html";

/** postMessage protocol for cross-frame picker coordination. */
export const TRANSFER_MESSAGE = {
  REGISTER_CHILD: "TRANSFER_PAPER_REGISTER_CHILD_DOCUMENT",
  HIGHLIGHTED: "TRANSFER_PAPER_HIGHLIGHTED",
  COMPLETED: "TRANSFER_PAPER_COMPLETED",
} as const;

/** IDs/classes the picker creates — excluded from hit testing. */
export const SNAPSHOT_UI_PREFIX = "x-paper-";

export const PICKER_BLANKET_ID = "x-paper-picker-blanket";
export const PICKER_OUTLINE_ID = "x-paper-picker-outline";

/** Tags remapped to div during serialization. */
export const REMAP_TO_DIV_TAGS = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "colgroup",
  "col",
  "input",
  "textarea",
  "body",
]);

/** Tags skipped entirely during serialization. */
export const SKIP_TAGS = new Set([
  "script",
  "style",
  "meta",
  "link",
  "noscript",
]);

/** Computed properties always kept even when equal to probe defaults. */
export const FORCE_INCLUDE_PROPERTIES = new Set(["display"]);

/** Collapsed transform matrices paired with absolute/fixed positioning. */
export const COLLAPSED_TRANSFORMS = new Set([
  "matrix(0, 0, 0, 1, 0, 0)",
  "matrix(0, 0, 0, 0, 0, 0)",
  "scaleX(0)",
  "scale(0)",
  "scaleY(0)",
]);

export function buildStylePropertyList(bodyStyle: CSSStyleDeclaration): string[] {
  const properties = Array.from(bodyStyle);
  properties.push(
    "aspect-ratio",
    "paint-order",
    "text-underline-offset",
    "text-decoration-thickness",
    "transform-box",
    "-webkit-text-stroke-color",
    "-webkit-text-stroke-width",
  );
  return properties;
}
