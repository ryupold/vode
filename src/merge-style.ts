import { DomElement, StyleProp } from "./vode";

let stylingElement: DomElement | undefined;

/** merge `StyleProp`s regardless of type
 * @returns {string} merged StyleProp */
export function mergeStyle(...props: StyleProp[]): StyleProp {
    if (props.length === 0) {
        return "";
    }
    if (props.length === 1) {
        return props[0];
    }

    if (typeof document !== "undefined") {
        const styling = stylingElement ??= document.createElement("div");
        try {
            const merged = styling.style;
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
            styling.style.cssText = "";
        }
    }

    // if no document is present (ssr)
    return mergeStyleFallback(props);
}

function mergeStyleFallback(props: StyleProp[]): string {
    const declarations = new Map<string, string>();

    const set = (rawProp: string, rawValue: string) => {
        const prop = rawProp.trim();
        if (!prop) return;
        const key = prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
        const value = rawValue.trim();
        if (value === "") {
            declarations.delete(key);
        } else {
            declarations.set(key, value);
        }
    };

    for (const style of props) {
        if (typeof style === "object" && style !== null) {
            for (const k in style) {
                const v = (style as Record<string, unknown>)[k];
                set(k, v === null || v === undefined ? "" : String(v));
            }
        } else if (typeof style === "string") {
            for (const declaration of style.split(";")) {
                const i = declaration.indexOf(":");
                if (i < 0) continue;
                set(declaration.slice(0, i), declaration.slice(i + 1));
            }
        }
    }

    let out = "";
    for (const [k, v] of declarations) out += `${k}: ${v}; `;
    return out.trimEnd();
}
