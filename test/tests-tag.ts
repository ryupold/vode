import { tag, DIV, SPAN } from "../index";
import { expect } from "./helper";

export default {
    "tag(): on a vode returns the tag name": async () => {
        await expect(tag([DIV]))
            .toEqual("div");
    },

    "tag(): on a vode with props and children": async () => {
        await expect(tag([DIV, { class: "foo" }, [SPAN, "hi"]]))
            .toEqual("div");
    },

    "tag(): on a text vode (string) returns undefined": async () => {
        await expect(tag("hello"))
            .toEqual(undefined);
    },

    "tag(): on falsy values returns undefined": async () => {
        await expect(tag(null)).toEqual(undefined);
        await expect(tag(undefined)).toEqual(undefined);
    },

    "tag(): on no-vode values returns undefined": async () => {
        await expect(tag(0)).toEqual(undefined);
        await expect(tag(true)).toEqual(undefined);
    },

    "tag(): on empty array returns undefined": async () => {
        await expect(tag([])).toEqual(undefined);
    }
};
