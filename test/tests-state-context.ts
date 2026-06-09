import { expect } from "./helper";
import { context } from "../src/state-context";
import { createState } from "../src/vode";

export default {
    "context(s)...get(): returns whole state": async () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state);

        await expect(ctx.get())
            .toEqual({ a: 1, b: 2 });
    },


    "context(s)...get(): deep nested": async () => {
        const state = createState({ a: { b: { c: 42 } } });
        const ctx = context(state);

        await expect(ctx.a.b.c.get())
            .toEqual(42);
    },

    "context(s)...get(): missing nested path returns undefined": async () => {
        const state = createState({ a: {} });
        const ctx = context(state);

        await expect((ctx.a as any).b.get())
            .toEqual(undefined);
    },

    "context(s)...put(): silently mutates state": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.put(2);

        await expect(state.a.b)
            .toEqual(2);
    },

    "context(s)...put(): on nested object replaces the sub-object": async () => {
        const state = createState({ a: { b: { x: 1, y: 2 } } });
        const ctx = context(state);
        ctx.a.b.put({ y: 99 });

        await expect(state.a.b)
            .toEqual({ y: 99 });
    },

    "context(s)...put(): at root level with empty keys": async () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state);
        ctx.put({ b: undefined });

        await expect(state)
            .toEqual({ a: 1 });
    },

    "context(s)...patch(): calls state.patch with proper deep partial": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state);
        ctx.a.b.patch(2);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ a: { b: 2 } });
    },

    "context(s)...patch(): async wraps in array": async () => {
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

    "context(s)...patch(): on nested deep path three levels": async () => {
        const state = createState({ x: { y: { z: 0 } } });
        const ctx = context(state);
        ctx.x.y.z.patch(100);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ x: { y: { z: 100 } } });
    },

    "context(s)...put(): with intermediate null creates objects along the path": async () => {
        const state = createState({ a: null as { b: number } | null });
        const ctx = context(state);

        ctx.a.b.put(42);
        await expect(state.a?.b).toEqual(42);

        ctx.a.put(null);
        await expect(state.a).toEqual(null);
        await expect(state.a?.b).toEqual(undefined);
    },

    "context(s)...put(): with three-level intermediate null": async () => {
        const state = createState({ a: null as { b: { c: number } } | null });
        const ctx = context(state);

        ctx.a.b.c.put(99);

        await expect(state.a?.b.c).toEqual(99);
    },

    "context(s)...put(): with multiple intermediate nulls": async () => {
        const state = createState({ a: { x: null as { z: string } | null, y: 1 } });
        const ctx = context(state);

        ctx.a.x.z.put("deep");

        await expect(state.a.x?.z).toEqual("deep");
        await expect(state.a.y).toEqual(1);
    },

    "context(s)...put(): merges into existing object properties via Object.assign": async () => {
        const state = createState({ items: { count: 0, name: "test", hidden: false } });
        const ctx = context(state);
        ctx.items.put({ count: 5 });
        await expect(state.items).toEqual({ count: 5, name: "test", hidden: false });
    },

    "context(state, s => s).get(): returns whole state": async () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state, s => s);

        await expect(ctx.get())
            .toEqual({ a: 1, b: 2 });
    },

    "context(state, s => s.a.b.c).get(): deep nested": async () => {
        const state = createState({ a: { b: { c: 42 } } });
        const ctx = context(state, s => s.a.b.c);

        await expect(ctx.get())
            .toEqual(42);
    },

    "context(state, s => s.a.b).get(): missing nested path returns undefined": async () => {
        const state = createState({ a: {} });
        const ctx = context(state, s => (s.a as any).b);

        await expect(ctx.get())
            .toEqual(undefined);
    },

    "context(state, s => s.a.b).put(): silently mutates state": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state, s => s.a.b);
        ctx.put(2);

        await expect(state.a.b)
            .toEqual(2);
    },

    "context(state, s => s.a.b).put(): on nested object replaces the sub-object": async () => {
        const state = createState({ a: { b: { x: 1, y: 2 } } });
        const ctx = context(state, s => s.a.b);
        ctx.put({ y: 99 });

        await expect(state.a.b)
            .toEqual({ y: 99 });
    },

    "context(state, s => s).put(): at root level with empty keys": async () => {
        const state = createState({ a: 1, b: 2 });
        const ctx = context(state, s => s);
        ctx.put({ b: undefined });

        await expect(state)
            .toEqual({ a: 1 });
    },

    "context(state, s => s.a.b).patch(): calls state.patch with proper deep partial": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state, s => s.a.b);
        ctx.patch(2);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ a: { b: 2 } });
    },

    "context(state, s => s.a.b).patch(): async wraps in array": async () => {
        const state = createState({ a: { b: 1 } });
        const ctx = context(state, s => s.a.b);
        ctx.patch(2, true);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(Array.isArray(patches[0]))
            .toEqual(true);
        await expect(patches[0][0])
            .toEqual({ a: { b: 2 } });
    },

    "context(state, s => s.x.y.z).patch(): on nested deep path three levels": async () => {
        const state = createState({ x: { y: { z: 0 } } });
        const ctx = context(state, s => s.x.y.z);
        ctx.patch(100);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ x: { y: { z: 100 } } });
    },

    "context(state, s => s.x).y.z: continue proxy sub-state targeting": async () => {
        const state = createState({ x: { y: { z: 0 } } });
        const ctx = context(state, s => s.x).y.z;
        ctx.patch(100);

        const patches = (state as any).patch.initialPatches;

        await expect(patches.length)
            .toEqual(1);
        await expect(patches[0])
            .toEqual({ x: { y: { z: 100 } } });
    },

    "context(state, s => s.a.b).put(): with intermediate null creates objects": async () => {
        const state = createState({ a: null as { b: number } | null });
        const ctx = context(state, s => s.a.b);

        ctx.put(42);
        await expect(state.a?.b).toEqual(42);
    },

    "context(state, s => s.a.b.c).put(): with three-level intermediate null": async () => {
        const state = createState({ a: null as { b: { c: number } } | null });
        const ctx = context(state, s => s.a.b.c);

        ctx.put(99);

        await expect(state.a?.b.c).toEqual(99);
    },

    "context(state, s => s.a.x.z).put(): with multiple intermediate nulls": async () => {
        const state = createState({ a: { x: null as { z: string } | null, y: 1 } });
        const ctx = context(state, s => s.a.x.z);

        ctx.put("deep");

        await expect(state.a.x?.z).toEqual("deep");
        await expect(state.a.y).toEqual(1);
    },

    "context(state, s => s.items).put(): merges into existing object properties via Object.assign": async () => {
        const state = createState({ items: { count: 0, name: "test", hidden: false } });
        const ctx = context(state, s => s.items);
        ctx.put({ count: 5 });
        await expect(state.items).toEqual({ count: 5, name: "test", hidden: false });
    },

    "context(state, s => s.get|put|patch...): 'get','put','patch' as intermediate properties without conflict": async () => {
        const state = createState({
            endpoints: {
                get: { count: 1 },
                put: { count: 2 },
                patch: { count: 3 }
            }
        });

        const getCtx = context(state, s => s.endpoints.get);
        await expect(getCtx.get()).toEqual({ count: 1 });

        const putCtx = context(state, s => s.endpoints.put);
        putCtx.put({ count: 99 });
        await expect(state.endpoints.put).toEqual({ count: 99 });

        const patchCtx = context(state, s => s.endpoints.patch);
        patchCtx.patch({ count: 42 });
        const patches = (state as any).patch.initialPatches;
        await expect(patches[0]).toEqual({ endpoints: { patch: { count: 42 } } });
    },
};
