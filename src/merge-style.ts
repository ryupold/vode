import { DomElement, StyleProp, globals } from "./vode";

type HasTempStyleElement = { stylingElement?: DomElement | undefined };

/** merge `StyleProp`s regardless of type
 * @returns {string} merged StyleProp */
export function mergeStyle(...props: StyleProp[]): StyleProp {
    if (props.length === 0) {
        return "";
    }
    if (props.length === 1) {
        return props[0];
    }

    if (typeof document === "undefined") {
        // no DOM available (e.g. SSR): merge by hand, mirroring CSSStyleDeclaration
        // semantics -> a property keeps its first position but takes its last value.
        const merged = new Map<string, string>();
        for (const style of props) {
            if (typeof style === "string") {
                for (const declaration of style.split(";")) {
                    const colon = declaration.indexOf(":");
                    if (colon < 0) continue;
                    const key = declaration.slice(0, colon).trim();
                    if (key) merged.set(key, declaration.slice(colon + 1).trim());
                }
            } else if (typeof style === "object" && style !== null) {
                for (const key in style) {
                    const value = style[key];
                    if (value === undefined || value === null) continue;
                    let cssKey = key;
                    const vendorMatch = key.match(/^(webkit|moz|ms|o)(?=[A-Z])/i);
                    if (vendorMatch) {
                        const prefix = vendorMatch[1].toLowerCase();
                        const rest = key.slice(prefix.length);
                        cssKey = "-" + prefix + rest.replace(/([A-Z])/g, "-$1").toLowerCase();
                    } else {
                        cssKey = key.replace(/[A-Z]/g, "-$&").toLowerCase();
                    }
                    merged.set(cssKey, String(value));
                }
            }
        }
        let result = "";
        for (const [key, value] of merged) result += `${key}: ${value}; `;
        return result.trimEnd();
    }

    let stylingElement = (globals as HasTempStyleElement).stylingElement!;
    if (!stylingElement) {
        (globals as HasTempStyleElement).stylingElement = stylingElement = document.createElement("div");
    }

    try {
        const merged = stylingElement.style;
        for (const style of props) {
            if (typeof style === "object" && style !== null) {
                for (const key in style) {
                    merged[key] = style[key];
                }
            } else if (typeof style === "string") {
                const old = merged.cssText;
                merged.cssText = (old?.length > 0 && old[old.length - 1] !== ";") ? (old + ";" + style) : (old + style);
            }
        }
        return merged.cssText;
    } finally {
        stylingElement.style.cssText = "";
    }
}
