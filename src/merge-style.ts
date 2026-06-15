import { DomElement, StyleProp, globals } from "./vode";

type HasTempStyleElement = { stylingElement?: DomElement | undefined };

/** merge `StyleProp`s regardless of type
 * @returns {string} merged StyleProp */
export function mergeStyle(...props: StyleProp[]): StyleProp {
    let stylingElement = (globals as HasTempStyleElement).stylingElement!;
    if (!stylingElement) {
        (globals as HasTempStyleElement).stylingElement = stylingElement = document.createElement("div");
    }

    if (props.length === 1) {
        return props[0];
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