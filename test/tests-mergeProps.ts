import { mergeProps, Props } from "../index";
import { expect } from "./helper";

export default {
    "mergeProps(): no args returns undefined": async () => {
        await expect(mergeProps()).toEqual(undefined);
    },

    "mergeProps(): single arg returned as-is": async () => {
        const p = { class: "foo" };
        await expect(mergeProps(p) === p).toEqual(true);
    },

    "mergeProps(): single falsy arg returns it": async () => {
        await expect(mergeProps(null)).toEqual(null);
        await expect(mergeProps(undefined)).toEqual(undefined);
    },

    "mergeProps(): two plain objects merged": async () => {
        await expect(mergeProps({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    },

    "mergeProps(): right overwrites left for simple keys": async () => {
        await expect(mergeProps({ a: 1, b: "x" }, { b: 2 })).toEqual({ a: 1, b: 2 });
    },

    "mergeProps(): class merged via mergeClass": async () => {
        await expect(mergeProps({ class: "foo" }, { class: "bar" })).toEqual({ class: "foo bar" });
    },

    "mergeProps(): style merged via mergeStyle (strings)": async () => {
        const result = mergeProps({ style: "color: red" }, { style: "font-size: 14px" }) as Props;
        await expect((<string>result.style!).includes("color: red")).toEqual(true);
        await expect((<string>result.style!).includes("font-size: 14px")).toEqual(true);
    },

    "mergeProps(): null and undefined entries skipped": async () => {
        await expect(mergeProps({ a: 1 }, null, { b: 2 }, undefined)).toEqual({ a: 1, b: 2 });
    },

    "mergeProps(): multiple args (3+)": async () => {
        await expect(mergeProps({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
    },

    "mergeProps(): first arg null returns defined from later args": async () => {
        await expect(mergeProps(null, { a: 1 })).toEqual({ a: 1 });
    }
};
