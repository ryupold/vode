import { expect } from "./helper";
import { context } from "../src/state-context";
import { createState } from "../src/vode";

export default {
    "StateContext.get() returns whole state": async () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state);

        await expect(ctx.get())
            .toEqual({ a: 1, b: 2 });
    },


    "StateContext.get(): deep nested": async () => {
        const state = createState({ a: { b: { c: 42 } } });
        const ctx = context(state);

        await expect(ctx.a.b.c.get())
            .toEqual(42);
    },

    "StateContext.get(): missing nested path returns undefined": async () => {
        const state = createState({ a: {} });
        const ctx = context(state);

        await expect((ctx.a as any).b.get())
            .toEqual(undefined);
    },

    "StateContext.put(): silently mutates state": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.put(2);

        await expect(state.a.b)
            .toEqual(2);
    },

    "StateContext.put() on nested object replaces the sub-object": async () => {
        const state = createState({ a: { b: { x: 1, y: 2 } } });
        const ctx = context(state);
        ctx.a.b.put({ y: 99 });

        await expect(state.a.b)
            .toEqual({ y: 99 });
    },

    "StateContext.put() at root level with empty keys": async () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state);
        ctx.put({ b: undefined });

        await expect(state)
            .toEqual({ a: 1 });
    },

    "StateContext.patch(): calls state.patch with proper deep partial": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.patch(2);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ a: { b: 2 } });
    },

    "StateContext.patch(): async wraps in array": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.patch(2, true);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(Array.isArray(patches[0]))
            .toEqual(true);
        await expect(patches[0][0])
            .toEqual({ a: { b: 2 } });
    },

    "StateContext.patch() on nested deep path three levels": async () => {
        const state = createState({ x: { y: { z: 0 } } });
        const ctx = context(state);
        ctx.x.y.z.patch(100);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ x: { y: { z: 100 } } });
    },

    "StateContext.put() with intermediate null creates objects along the path": async () => {
        const state = createState({ a: null as { b: number } | null });
        const ctx = context(state);

        ctx.a.b.put(42);
        await expect(state.a?.b).toEqual(42);

        ctx.a.put(null);
        await expect(state.a).toEqual(null);
        await expect(state.a?.b).toEqual(undefined);
    },

    "StateContext.put() with three-level intermediate null": async () => {
        const state = createState({ a: null as { b: { c: number } } | null });
        const ctx = context(state);

        ctx.a.b.c.put(99);

        await expect(state.a?.b.c).toEqual(99);
    },

    "StateContext.put() with multiple intermediate nulls": async () => {
        const state = createState({ a: { x: null as { z: string } | null, y: 1 } });
        const ctx = context(state);

        ctx.a.x.z.put("deep");

        await expect(state.a.x?.z).toEqual("deep");
        await expect(state.a.y).toEqual(1);
    },

    "StateContext.put() merges into existing object properties via Object.assign": async () => {
        const state = createState({ items: { count: 0, name: "test", hidden: false } });
        const ctx = context(state);
        // Line 110-111: when existing value is object and new value is object, Object.assign merges
        ctx.items.put({ count: 5 });
        await expect(state.items).toEqual({ count: 5, name: "test", hidden: false });
    },
};
