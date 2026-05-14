import { tag, DIV, SPAN } from "../index";
import { expect } from "./helper";

export default {
    "tag(): on a vode returns the tag name": () => {
        expect(tag([DIV]))
            .toEqual("div");
    },

    "tag(): on a vode with props and children": () => {
        expect(tag([DIV, { class: "foo" }, [SPAN, "hi"]]))
            .toEqual("div");
    },

    "tag(): on a text vode (string) returns #text": () => {
        expect(tag("hello"))
            .toEqual("#text");
    },

    "tag(): on falsy values returns undefined": () => {
        expect(tag(null)).toEqual(undefined);
        expect(tag(undefined)).toEqual(undefined);
    },

    "tag(): on no-vode values returns undefined": () => {
        expect(tag(0)).toEqual(undefined);
        expect(tag(true)).toEqual(undefined);
    },

    "tag(): on empty array returns undefined": () => {
        expect(tag([])).toEqual(undefined);
    }
};
