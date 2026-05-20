import { PAPER_HTML_WRAPPER } from "./constants.js";

/** Wrap serialized HTML in the envelope Paper desktop expects on paste. */
export function wrapForPaper(html: string): string {
  return `<${PAPER_HTML_WRAPPER}>${html}</${PAPER_HTML_WRAPPER}>`;
}

/** Remove the Paper wrapper if present. */
export function unwrapPaperHtml(wrapped: string): string {
  const pattern = new RegExp(
    `^<${PAPER_HTML_WRAPPER}>([\\s\\S]*)</${PAPER_HTML_WRAPPER}>$`,
  );
  const match = wrapped.match(pattern);
  return match ? match[1] : wrapped;
}
