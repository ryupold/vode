import { ClassProp } from "./vode.js";

/** merge `ClassProp`s regardless of structure */
export function mergeClass(a: ClassProp, b: ClassProp): ClassProp {
    if (!a) return b;
    if (!b) return a;

    if (typeof a === "string" && typeof b === "string") {
        const aSplit = a.split(" ");
        const bSplit = b.split(" ");
        const classSet = new Set([...aSplit, ...bSplit]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (typeof a === "string" && Array.isArray(b)) {
        const classSet = new Set([...b, ...a.split(" ")]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (Array.isArray(a) && typeof b === "string") {
        const classSet = new Set([...a, ...b.split(" ")]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (Array.isArray(a) && Array.isArray(b)) {
        const classSet = new Set([...a, ...b]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (typeof a === "string" && typeof b === "object") {
        return { [a]: true, ...b };
    }
    else if (typeof a === "object" && typeof b === "string") {
        return { ...a, [b]: true };
    }
    else if (typeof a === "object" && typeof b === "object") {
        return { ...a, ...b };
    } else if (typeof a === "object" && Array.isArray(b)) {
        const aa = { ...a };
        for (const item of b as string[]) {
            (<Record<string, boolean | null | undefined>>aa)[item] = true;
        }
        return aa;
    } else if (Array.isArray(a) && typeof b === "object") {
        const aa: Record<string, any> = {};
        for (const item of a as string[]) {
            aa[item] = true;
        }
        for (const bKey of Object.keys(b)) {
            aa[bKey] = (<Record<string, boolean | null | undefined>>b)[bKey];
        }
        return aa;
    }

    throw new Error(`cannot merge classes of ${a} (${typeof a}) and ${b} (${typeof b})`);
}