/** Serialize a text node with whitespace normalization. */
export function serializeTextNode(node: Text): string {
  const text = node.textContent;
  if (!text) return "";

  if (node.parentElement) {
    const whiteSpace = getComputedStyle(node.parentElement).whiteSpace;
    if (whiteSpace === "pre" || whiteSpace === "pre-wrap") return text;
    if (whiteSpace === "pre-line") return text.replace(/[^\S\n]+/g, " ");
  }

  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed) {
    const leading = text.length - text.trimStart().length;
    const trailing = text.length - text.trimEnd().length;
    let hasLeadingSpace = false;
    let hasTrailingSpace = false;

    if (leading > 0) {
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, leading);
      hasLeadingSpace = range.getBoundingClientRect().width > 0;
    }

    if (trailing > 0) {
      const range = document.createRange();
      range.setStart(node, text.length - trailing);
      range.setEnd(node, text.length);
      hasTrailingSpace = range.getBoundingClientRect().width > 0;
    }

    return `${hasLeadingSpace ? " " : ""}${collapsed}${hasTrailingSpace ? " " : ""}`;
  }

  const range = document.createRange();
  range.selectNode(node);
  return range.getBoundingClientRect().width === 0 ? "" : " ";
}
