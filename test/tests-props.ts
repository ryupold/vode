import { props, DIV, SPAN } from "../index";
import { expect } from "./helper";

export default {
    "props(): on vode with props returns props object": async () => {
        await expect(props([DIV, { class: "foo" }, "hello"]))
            .toEqual({ class: "foo" });
    },

    "props(): on just-tag vode returns undefined": async () => {
        await expect(props([DIV])).toEqual(undefined);
    },

    "props(): on text vode returns undefined": async () => {
        await expect(props("hello")).toEqual(undefined);
    },

    "props(): on vode where second element is an array (child) returns undefined": async () => {
        await expect(props([DIV, [SPAN]] as any)).toEqual(undefined);
    },

    "props(): on vode where second element is null returns undefined": async () => {
        await expect(props([DIV, null as any, "hi"])).toEqual(undefined);
    },

    "props(): on falsy input returns undefined": async () => {
        await expect(props(null as any)).toEqual(undefined);
        await expect(props(undefined as any)).toEqual(undefined);
    },

    "props(): on vode with length 1 returns undefined": async () => {
        await expect(props([DIV] as any)).toEqual(undefined);
    }
};
