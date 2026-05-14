import { mergeProps, Props } from "../index";
import { expect } from "./helper";

export default {
    "mergeProps(): no args returns undefined": () => {
        expect(mergeProps()).toEqual(undefined);
    },

    "mergeProps(): single arg returned as-is": () => {
        const p = { class: "foo" };
        expect(mergeProps(p) === p).toEqual(true);
    },

    "mergeProps(): two plain objects merged": () => {
        expect(mergeProps({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    },

    "mergeProps(): right overwrites left for simple keys": () => {
        expect(mergeProps({ a: 1, b: "x" }, { b: 2 })).toEqual({ a: 1, b: 2 });
    },

    "mergeProps(): class merged via mergeClass": () => {
        expect(mergeProps({ class: "foo" }, { class: "bar" })).toEqual({ class: "foo bar" });
    },

    "mergeProps(): style merged via mergeStyle (strings)": () => {
        const result = mergeProps({ style: "color: red" }, { style: "font-size: 14px" }) as Props;
        expect((<string>result.style!).includes("color: red")).toEqual(true);
        expect((<string>result.style!).includes("font-size: 14px")).toEqual(true);
    },

    "mergeProps(): null and undefined entries skipped": () => {
        expect(mergeProps({ a: 1 }, null, { b: 2 }, undefined)).toEqual({ a: 1, b: 2 });
    },

    "mergeProps(): multiple args (3+)": () => {
        expect(mergeProps({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
    },

    "mergeProps(): first arg null returns defined from later args": () => {
        expect(mergeProps(null, { a: 1 })).toEqual({ a: 1 });
    }
};
