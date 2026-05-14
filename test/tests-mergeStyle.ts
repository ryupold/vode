import { mergeStyle } from "../index";
import { expect } from "./helper";

export default {
    "mergeStyle(): no args returns empty string": () => {
        expect(mergeStyle()).toEqual("");
    },

    "mergeStyle(): object style sets properties, returns cssText": () => {
        const result = mergeStyle({ color: "red", fontSize: "14px" });
        expect(typeof result).toEqual("string");
    },

    "mergeStyle(): single string starts with semicolon": () => {
        expect(mergeStyle("color: red")).toEqual(";color: red");
    },

    "mergeStyle(): two strings are concatenated": () => {
        expect(mergeStyle("color: red", "font-size: 14px")).toEqual(";color: red;font-size: 14px");
    },

    "mergeStyle(): object then string": () => {
        const result = mergeStyle({ color: "red" }, "font-size: 14px") as string;
        expect(result.indexOf("font-size: 14px") > 0).toEqual(true);
    },

    "mergeStyle(): null and undefined entries are skipped": () => {
        expect(mergeStyle(null, "color: red", undefined)).toEqual(";color: red");
    },

    "mergeStyle(): multiple objects and strings alternate": () => {
        const result = mergeStyle(
            { color: "red" },
            "font-size: 14px",
            { background: "blue" }
        ) as string;
        expect(result.includes("font-size: 14px")).toEqual(true);
    }
};
