import {
  COLLAPSED_TRANSFORMS,
  FORCE_INCLUDE_PROPERTIES,
  SNAPSHOT_UI_PREFIX,
  buildStylePropertyList,
} from "./constants.js";
import type { StyleRecord } from "./types.js";

export function isSnapshotUiElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag.startsWith(SNAPSHOT_UI_PREFIX) || element.id.startsWith(SNAPSHOT_UI_PREFIX);
}

export function stylesToString(styles: StyleRecord): string {
  return Object.entries(styles)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}

export function isCollapsedTransform(styles: StyleRecord): boolean {
  return (
    COLLAPSED_TRANSFORMS.has(styles.transform ?? "") &&
    ["absolute", "fixed"].includes(styles.position ?? "")
  );
}

export function pseudoContentText(styles: StyleRecord): string {
  const content = styles.content;
  if (!content) return "";
  const match = content.match(/^["'](.*)["']$/);
  return match ? match[1] : "";
}

export function inheritBackgroundColor(element: Element): string {
  let parent: Element | null = element.parentElement;
  if (
    !parent &&
    element.parentNode instanceof ShadowRoot &&
    element.parentNode.host instanceof Element
  ) {
    parent = element.parentNode.host;
  }

  if (!parent) return "";

  const backgroundColor = getComputedStyle(parent).backgroundColor;
  if (
    backgroundColor &&
    backgroundColor !== "rgba(0, 0, 0, 0)" &&
    backgroundColor !== "transparent"
  ) {
    return backgroundColor;
  }

  return inheritBackgroundColor(parent);
}

export function isInsideSvg(element: Element): boolean {
  let parent: Element | null = element.parentElement;
  while (parent) {
    if (parent instanceof SVGElement) return true;
    parent = parent.parentElement;
  }
  return false;
}

type ExtractStylesOptions = {
  isRoot?: boolean;
  pseudo?: "::before" | "::after" | "::placeholder";
  styleProperties: string[];
};

/**
 * Diff computed styles against a neutral probe element inserted as a sibling.
 * Ported from the Paper Snapshot extension serializer.
 */
export function extractComputedStyles(
  element: Element,
  options: ExtractStylesOptions,
): StyleRecord {
  const { isRoot = false, pseudo, styleProperties } = options;
  const styles: StyleRecord = {};
  const elementValues = new Map<string, string>();

  if (pseudo) {
    const computed = getComputedStyle(element, pseudo);
    for (const property of styleProperties) {
      elementValues.set(property, computed.getPropertyValue(property));
    }
  } else if ("computedStyleMap" in element && typeof element.computedStyleMap === "function") {
    const styleMap = element.computedStyleMap();
    const computed = getComputedStyle(element);
    for (const property of styleProperties) {
      const mapped = styleMap.get(property);
      if (mapped) {
        elementValues.set(property, mapped.toString());
      } else {
        const value = computed.getPropertyValue(property);
        if (value) elementValues.set(property, value);
      }
    }
  } else {
    const computed = getComputedStyle(element);
    for (const property of styleProperties) {
      const value = computed.getPropertyValue(property);
      if (value) elementValues.set(property, value);
    }
  }

  const probeValues = new Map<string, string>();
  const probe = document.createElement("link");
  probe.textContent = element.textContent;

  probe.style.setProperty("background-color", "transparent", "important");
  probe.style.setProperty("border-color", "hotpink", "important");
  probe.style.setProperty("border-radius", "0", "important");
  probe.style.setProperty("border-width", "0px", "important");
  probe.style.setProperty("border-style", "none", "important");
  probe.style.setProperty("box-shadow", "none", "important");
  probe.style.setProperty("color", "black", "important");
  probe.style.setProperty("fill", "black", "important");
  probe.style.setProperty("font-size", "1px", "important");
  probe.style.setProperty("font-weight", "400", "important");
  probe.style.setProperty("height", "auto", "important");
  probe.style.setProperty("margin", "0", "important");
  probe.style.setProperty("overflow", "visible", "important");
  probe.style.setProperty("padding", "0", "important");
  probe.style.setProperty("text-align", "initial", "important");
  probe.style.setProperty("width", "auto", "important");
  probe.style.setProperty("z-index", "auto", "important");

  if (isRoot) {
    probe.style.color = "hotpink";
    probe.style.lineHeight = "0.1234";
    probe.style.fontFamily = '"Papyrus"';
    probe.style.listStyleType = "initial";
  }

  if (element.parentElement?.lastElementChild === element) {
    element.insertAdjacentElement("afterend", probe);
  } else {
    element.insertAdjacentElement("beforebegin", probe);
  }

  if (pseudo) {
    const computed = getComputedStyle(probe, pseudo);
    for (const property of styleProperties) {
      probeValues.set(property, computed.getPropertyValue(property));
    }
  } else if ("computedStyleMap" in probe && typeof probe.computedStyleMap === "function") {
    const styleMap = probe.computedStyleMap();
    const computed = getComputedStyle(probe);
    for (const property of styleProperties) {
      const mapped = styleMap.get(property);
      if (mapped) {
        probeValues.set(property, mapped.toString());
      } else {
        const value = computed.getPropertyValue(property);
        if (value) probeValues.set(property, value);
      }
    }
  } else {
    const computed = getComputedStyle(probe);
    for (const property of styleProperties) {
      const value = computed.getPropertyValue(property);
      if (value) probeValues.set(property, value);
    }
  }

  probe.remove();

  for (const property of styleProperties) {
    const value = elementValues.get(property);
    const baseline = probeValues.get(property);
    if (
      value &&
      !value.startsWith("--") &&
      (value !== baseline || FORCE_INCLUDE_PROPERTIES.has(property))
    ) {
      styles[property] = value.replaceAll('"', "'");
    }
  }

  if (isRoot) {
    const rect = element.getBoundingClientRect();
    const width = `${Math.ceil(rect.width)}px`;
    const height = `${Math.ceil(rect.height)}px`;

    if (
      rect.width > 200 ||
      rect.height > 200 ||
      styles.width?.includes("%") ||
      styles.height?.includes("%")
    ) {
      styles.width = width;
      styles.height = height;
    }

    if (
      !elementValues.get("background-color") ||
      elementValues.get("background-color") === "rgba(0, 0, 0, 0)"
    ) {
      styles["background-color"] = inheritBackgroundColor(element);
    }
  }

  if (styles["scrollbar-gutter"]?.includes("stable") && element instanceof HTMLElement) {
    const borderLeft = parseFloat(elementValues.get("border-left-width") || "0");
    const borderRight = parseFloat(elementValues.get("border-right-width") || "0");
    const scrollbarWidth = element.offsetWidth - element.clientWidth - borderLeft - borderRight;

    if (scrollbarWidth > 0) {
      const both = styles["scrollbar-gutter"].includes("both");
      const direction = elementValues.get("direction") || "ltr";
      const paddingRight = parseFloat(styles["padding-right"] || "0");
      const paddingLeft = parseFloat(styles["padding-left"] || "0");

      if (direction === "rtl") {
        styles["padding-left"] = `${paddingLeft + scrollbarWidth}px`;
        if (both) styles["padding-right"] = `${paddingRight + scrollbarWidth}px`;
      } else {
        styles["padding-right"] = `${paddingRight + scrollbarWidth}px`;
        if (both) styles["padding-left"] = `${paddingLeft + scrollbarWidth}px`;
      }
    }
  }

  if (
    (pseudo === "::after" || pseudo === "::before") &&
    !styles.content
  ) {
    return {};
  }

  if (Object.keys(styles).length === 0) return {};
  return styles;
}

export function createStylePropertyList(doc: Document): string[] {
  return buildStylePropertyList(getComputedStyle(doc.body));
}
