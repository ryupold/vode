import { children, child, childCount, childrenStart, DIV, SPAN, P, Vode } from "../index";
import { expect } from "./helper";

export default {
    "children(): tag+props+children returns children array": async () => {
        const v: Vode = [DIV, { class: "x" }, [SPAN, "a"], [P, "b"]];
        const c = children(v);
        await expect(Array.isArray(c)).toEqual(true);
        await expect(c!.length).toEqual(2);
    },

    "children(): tag+children (no props) returns children array": async () => {
        const v: Vode = [DIV, [SPAN, "a"], [P, "b"]];
        const c = children(v);
        await expect(Array.isArray(c)).toEqual(true);
        await expect(c!.length).toEqual(2);
    },

    "children(): just-tag vode returns null": async () => {
        await expect(children([DIV])).toEqual(undefined);
    },

    "children(): text vode returns null": async () => {
        await expect(children("hello")).toEqual(undefined);
    },

    "childrenStart(): with props+children returns 2": async () => {
        await expect(childrenStart([DIV, { class: "x" }, [SPAN]])).toEqual(2);
    },

    "childrenStart(): without props but with children returns 1": async () => {
        await expect(childrenStart([DIV, [SPAN]])).toEqual(1);
    },

    "childrenStart(): just-tag returns -1": async () => {
        await expect(childrenStart([DIV])).toEqual(-1);
    },

    "childrenStart(): text vode returns -1": async () => {
        await expect(childrenStart("hello")).toEqual(-1);
    },

    "childCount(): matches actual child count": async () => {
        await expect(childCount([DIV, { class: "x" }, [SPAN, "a"], [P, "b"]])).toEqual(2);
        await expect(childCount([DIV, [SPAN]])).toEqual(1);
    },

    "childCount(): returns 0 for no-children vode": async () => {
        await expect(childCount([DIV])).toEqual(0);
        await expect(childCount("hello" as any)).toEqual(0);
    },

    "child(): returns correct child at index": async () => {
        const v: Vode = [DIV, { class: "x" }, [SPAN, "a"], [P, "b"]];

        await expect(child(v, 0)).toEqual([SPAN, "a"]);
        await expect(child(v, 1)).toEqual([P, "b"]);
    },

    "child(): returns undefined for out-of-bounds": async () => {
        await expect(child([DIV, { class: "x" }, [SPAN]], 5))
            .toEqual(undefined);
    },

    "child(): returns undefined for text vode": async () => {
        await expect(child("hello" as any, 0))
            .toEqual(undefined);
    }
};
