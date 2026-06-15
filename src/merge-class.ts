import { ClassProp } from "./vode";

/** merge `ClassProp`s regardless of structure */
export function mergeClass(...classes: ClassProp[]): ClassProp {
    if (!classes || classes.length === 0) return null;
    if (classes.length === 1) return classes[0];

    let finalClass: ClassProp = classes[0];
    for (let index = 1; index < classes.length; index++) {
        const a = finalClass, b = classes[index];
        if (!a) {
            finalClass = b;
        }
        else if (!b) {
            continue;
        }
        else if (typeof a === "string" && typeof b === "string") {
            const aSplit = a.split(" ");
            const bSplit = b.split(" ");
            const classSet = new Set([...aSplit, ...bSplit]);
            finalClass = Array.from(classSet).join(" ").trim();
        }
        else if (typeof a === "string" && Array.isArray(b)) {
            const classSet = new Set([...a.split(" "), ...b]);
            finalClass = Array.from(classSet).join(" ").trim();
        }
        else if (Array.isArray(a) && typeof b === "string") {
            const classSet = new Set([...a, ...b.split(" ")]);
            finalClass = Array.from(classSet).join(" ").trim();
        }
        else if (Array.isArray(a) && Array.isArray(b)) {
            const classSet = new Set([...a, ...b]);
            finalClass = Array.from(classSet).join(" ").trim();
        }
        else if (typeof a === "string" && typeof b === "object") {
            const aSplit = a.split(" ");
            const aObj: Record<string, true> = {};
            for (const cls of aSplit) aObj[cls] = true;
            finalClass = { ...aObj, ...b };
        }
        else if (typeof a === "object" && typeof b === "string") {
            const bSplit = b.split(" ");
            const bObj: Record<string, true> = {};
            for (const cls of bSplit) bObj[cls] = true;
            finalClass = { ...a, ...bObj };
        }
        else if (typeof a === "object" && Array.isArray(b)) {
            const aa = { ...a };
            for (const item of b as string[]) {
                (<Record<string, boolean | null | undefined>>aa)[item] = true;
            }
            finalClass = aa;
        } else if (Array.isArray(a) && typeof b === "object") {
            const aa: Record<string, any> = {};
            for (const item of a as string[]) {
                aa[item] = true;
            }
            for (const bKey of Object.keys(b!)) {
                aa[bKey] = (<Record<string, boolean | null | undefined>>b)[bKey];
            }
            finalClass = aa;
        } else if (typeof a === "object" && typeof b === "object") {
            finalClass = { ...a, ...b };
        }
        else throw new Error(`cannot merge classes of ${a} (${typeof a}) and ${b} (${typeof b})`);
    }
    return finalClass;
}