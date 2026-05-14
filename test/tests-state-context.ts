import { expect } from "./helper";
import { context } from "../src/state-context";
import { createState } from "../src/vode";

export default {
    "StateContext.state: returns the state reference": () => {
        const state = createState({ x: 10 });
        const ctx = context(state);

        expect((ctx).state === state)
            .toEqual(true);
    },

    "StateContext.get() returns whole state": () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state);

        expect(ctx.get())
            .toEqual({ a: 1, b: 2 });
    },


    "StateContext.get(): deep nested": () => {
        const state = createState({ a: { b: { c: 42 } } });
        const ctx = context(state);

        expect(ctx.a.b.c.get())
            .toEqual(42);
    },

    "StateContext.get(): missing nested path returns undefined": () => {
        const state = createState({ a: {} });
        const ctx = context(state);

        expect((ctx.a as any).b.get())
            .toEqual(undefined);
    },

    "StateContext.put(): silently mutates state": () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.put(2);

        expect(state.a.b)
            .toEqual(2);
    },

    "StateContext.put() on nested object replaces the sub-object": () => {
        const state = createState({ a: { b: { x: 1, y: 2 } } });
        const ctx = context(state);
        ctx.a.b.put({ y: 99 });

        expect(state.a.b)
            .toEqual({ y: 99 });
    },

    "StateContext.put() at root level with empty keys": () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state);
        ctx.put({ b: undefined });

        expect(state)
            .toEqual({ a: 1 });
    },

    "StateContext.patch(): calls state.patch with proper deep partial": () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.patch(2);

        const patches = (state as any).patch.initialPatches;

        expect(patches.length)
            .toEqual(1);
        expect(patches[0])
            .toEqual({ a: { b: 2 } });
    },

    "StateContext.patch(): async wraps in array": () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.patch(2, true);

        const patches = (state as any).patch.initialPatches;

        expect(patches.length)
            .toEqual(1);
        expect(Array.isArray(patches[0]))
            .toEqual(true);
        expect(patches[0][0])
            .toEqual({ a: { b: 2 } });
    },

    "StateContext.patch() on nested deep path three levels": () => {
        const state = createState({ x: { y: { z: 0 } } });
        const ctx = context(state);
        ctx.x.y.z.patch(100);

        const patches = (state as any).patch.initialPatches;

        expect(patches.length)
            .toEqual(1);
        expect(patches[0])
            .toEqual({ x: { y: { z: 100 } } });
    },
};
