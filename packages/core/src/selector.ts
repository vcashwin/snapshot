/** Query a selector across shadow roots in the given document. */
export function querySelectorAcrossShadowRoots(
  selector: string,
  root: Document | ShadowRoot = document,
): Element | null {
  const queue: (Document | ShadowRoot)[] = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const match = current.querySelector(selector);
    if (match) return match;

    for (const element of current.querySelectorAll("*")) {
      if (element.shadowRoot) {
        queue.push(element.shadowRoot);
      }
    }
  }

  return null;
}
