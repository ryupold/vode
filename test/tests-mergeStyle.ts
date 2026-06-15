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
    }
};
