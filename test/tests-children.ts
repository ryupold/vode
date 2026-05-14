import { children, child, childCount, childrenStart, DIV, SPAN, P, Vode } from "../index";
import { expect } from "./helper";

export default {
    "children(): tag+props+children returns children array": () => {
        const v: Vode = [DIV, { class: "x" }, [SPAN, "a"], [P, "b"]];
        const c = children(v);
        expect(Array.isArray(c)).toEqual(true);
        expect(c!.length).toEqual(2);
    },

    "children(): tag+children (no props) returns children array": () => {
        const v: Vode = [DIV, [SPAN, "a"], [P, "b"]];
        const c = children(v);
        expect(Array.isArray(c)).toEqual(true);
        expect(c!.length).toEqual(2);
    },

    "children(): just-tag vode returns null": () => {
        expect(children([DIV])).toEqual(null);
    },

    "children(): text vode returns null": () => {
        expect(children("hello")).toEqual(null);
    },

    "childrenStart(): with props+children returns 2": () => {
        expect(childrenStart([DIV, { class: "x" }, [SPAN]])).toEqual(2);
    },

    "childrenStart(): without props but with children returns 1": () => {
        expect(childrenStart([DIV, [SPAN]])).toEqual(1);
    },

    "childrenStart(): just-tag returns -1": () => {
        expect(childrenStart([DIV])).toEqual(-1);
    },

    "childrenStart(): text vode returns -1": () => {
        expect(childrenStart("hello")).toEqual(-1);
    },

    "childCount(): matches actual child count": () => {
        expect(childCount([DIV, { class: "x" }, [SPAN, "a"], [P, "b"]])).toEqual(2);
        expect(childCount([DIV, [SPAN]])).toEqual(1);
    },

    "childCount(): returns 0 for no-children vode": () => {
        expect(childCount([DIV])).toEqual(0);
        expect(childCount("hello" as any)).toEqual(0);
    },

    "child(): returns correct child at index": () => {
        const v: Vode = [DIV, { class: "x" }, [SPAN, "a"], [P, "b"]];

        expect(child(v, 0)).toEqual([SPAN, "a"]);
        expect(child(v, 1)).toEqual([P, "b"]);
    },

    "child(): returns undefined for out-of-bounds": () => {
        expect(child([DIV, { class: "x" }, [SPAN]], 5))
            .toEqual(undefined);
    },

    "child(): returns undefined for text vode": () => {
        expect(child("hello" as any, 0))
            .toEqual(undefined);
    }
};
