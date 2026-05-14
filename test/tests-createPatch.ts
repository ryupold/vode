import { createPatch } from "../src/vode";
import { expect } from "./helper";

export default {
    "createPatch(): just returns the input": () => {
        const p = { a: 123 };
        expect(createPatch(p) === p).toEqual(true);
    },

    "createPatch(): returns undefined as-is": () => {
        expect(createPatch(undefined)).toEqual(undefined);
    },

    "createPatch(): returns null as-is": () => {
        expect(createPatch(null)).toEqual(null);
    },

    "createPatch(): returns function as-is": () => {
        const fn = () => ({});
        expect(createPatch(fn) === fn).toEqual(true);
    },

    "createPatch(): returns primitive as-is": () => {
        expect(createPatch(42)).toEqual(42);
        expect(createPatch("ignored")).toEqual("ignored");
        expect(createPatch(false)).toEqual(false);
    }
};
