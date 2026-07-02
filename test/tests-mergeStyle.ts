import { mergeStyle } from "../index";
import { expect } from "./helper";

// Helper to normalize style strings for comparison (browser normalizes CSS differently)
function normalizeStyle(s: string): string {
    return s.replace(/;\s*/g, ';').replace(/:\s*/g, ':').replace(/^;/, '').replace(/;$/, '').toLowerCase();
}

function hasStyle(result: string, prop: string, value: string): boolean {
    const normalized = normalizeStyle(result);

    return normalized.includes(`${prop}:${value}`) || normalized.includes(`${prop}: ${value}`);
}

/** run `fn` with no global `document` so mergeStyle takes its ssr fallback.
 *
 * in a real browser `window.document` is an unforgeable getter that can neither
 * be assigned nor deleted, so ssr cannot be simulated there: returns
 * `undefined` and the caller skips its assertions (node covers this path) */
function fakeSSR<T>(fn: () => T): T | undefined {
    const doc = (globalThis as any).document;
    try {
        (globalThis as any).document = undefined;
    } catch {
        return undefined;
    }
    if ((globalThis as any).document !== undefined) {
        return undefined;
    }
    try {
        return fn();
    } finally {
        (globalThis as any).document = doc;
    }
}


export default {
    "mergeStyle(): no args returns empty string": async () => {
        await expect(mergeStyle()).toEqual("");
    },

    "mergeStyle(): single object style just returns it": async () => {
        const result = mergeStyle({ color: "red", fontSize: "14px" });
        expect(result).toBeA("object");
    },

    "mergeStyle(): single string includes the style": async () => {
        const result = mergeStyle("color: red") as string;
        await expect(hasStyle(result, "color", "red")).toEqual(true);
    },

    "mergeStyle(): two strings are concatenated": async () => {
        const result = mergeStyle("color: red", "font-size: 14px") as string;

        await expect(hasStyle(result, "color", "red")).toEqual(true, "has color: red");
        await expect(hasStyle(result, "font-size", "14px")).toEqual(true, "has font-size: 14px");
    },

    "mergeStyle(): object then string": async () => {
        const result = mergeStyle({ color: "red" }, "font-size: 14px") as string;
        await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
    },

    "mergeStyle(): null and undefined entries are skipped": async () => {
        const result = mergeStyle(null, "color: red", undefined) as string;
        await expect(hasStyle(result, "color", "red")).toEqual(true);
    },

    "mergeStyle(): multiple objects and strings alternate": async () => {
        const result = mergeStyle(
            { color: "red" },
            "font-size: 14px",
            { background: "blue" }
        ) as string;
        await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
    },

    //=== SSR fallback (no DOM) ===

    "mergeStyle(): [ssr] merges object declarations into the css string": async () => {
        const result = fakeSSR(() => mergeStyle({ color: "red" }, "font-size: 14px")) as string | undefined;
        if (result === undefined) return; // skipped: real browser
        await expect(hasStyle(result, "color", "red")).toEqual(true, "object 'color' survives the SSR merge");
        await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
    },

    "mergeStyle(): [ssr] converts camelCase keys to kebab-case": async () => {
        const result = fakeSSR(() => mergeStyle({ fontSize: "14px" }, { backgroundColor: "blue" })) as string | undefined;
        if (result === undefined) return; // skipped: real browser
        await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
        await expect(hasStyle(result, "background-color", "blue")).toEqual(true);
    },

    "mergeStyle(): [ssr] later declarations override earlier ones": async () => {
        const result = fakeSSR(() => mergeStyle("color: red", { color: "blue" })) as string | undefined;
        if (result === undefined) return; // skipped: real browser
        await expect(hasStyle(result, "color", "blue")).toEqual(true);
        await expect(hasStyle(result, "color", "red")).toEqual(false, "earlier 'color' was overridden");
    },

    "mergeStyle(): [ssr] empty value removes a declaration": async () => {
        const result = fakeSSR(() => mergeStyle("color: red; font-size: 14px", { color: "" })) as string | undefined;
        if (result === undefined) return; // skipped: real browser
        await expect(hasStyle(result, "color", "red")).toEqual(false, "'color' removed by empty value");
        await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
    },

    "mergeStyle(): [ssr] preserves custom properties verbatim": async () => {
        const result = fakeSSR(() => mergeStyle("--brand: rebeccapurple", { color: "red" })) as string | undefined;
        if (result === undefined) return; // skipped: real browser
        await expect(hasStyle(result, "--brand", "rebeccapurple")).toEqual(true, "custom property is not kebab-mangled");
        await expect(hasStyle(result, "color", "red")).toEqual(true);
    },
};
