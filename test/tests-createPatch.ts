import { createPatch } from "../src/vode";
import { expect } from "./helper";

export default {
    "createPatch(): just returns the input": async () => {
        const p = { a: 123 };
        await expect(createPatch(p) === p).toEqual(true);
    },

    "createPatch(): returns undefined as-is": async () => {
        await expect(createPatch(undefined)).toEqual(undefined);
    },

    "createPatch(): returns null as-is": async () => {
        await expect(createPatch(null)).toEqual(null);
    },

    "createPatch(): returns function as-is": async () => {
        const fn = () => ({});
        await expect(createPatch(fn) === fn).toEqual(true);
    },

    "createPatch(): returns primitive as-is": async () => {
        await expect(createPatch(42)).toEqual(42);
        await expect(createPatch("ignored")).toEqual("ignored");
        await expect(createPatch(false)).toEqual(false);
    },
};
