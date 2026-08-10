import { expect } from "./helper";
import { createState, app, DIV, PatchableState, $STATS, Stats } from "../index";

export default {
    "createState(): throws when state is not an object": async () => {
        const err = expect(() => createState(null as any)).toFail();
        await expect(err.message).toEqual("createState() must be called with an object argument");
    },

    "createState(): adds patch function to state": async () => {
        const state = createState({ x: 1 });
        await expect(typeof (state as PatchableState).patch).toEqual("function");
        await expect(state).toEqual({ x: 1, patch: (state as PatchableState).patch });
    },

    "createState(): add $STATS reference to state": async () => {
        const state = createState({ x: 1 });
        await expect(typeof (state as PatchableState)[$STATS]).toEqual("object");
        await expect((state as PatchableState)[$STATS]).toEqual({
            asyncRenderCount: 0,
            asyncRenderPatchCount: 0,
            lastAsyncRenderTime: 0,
            lastSyncRenderTime: 0,
            liveEffectCount: 0,
            patchCount: 0,
            syncRenderCount: 0,
            syncRenderPatchCount: 0,
        });
    },

    "createState(): patch is non-enumerable": async () => {
        const state = createState({ x: 1 });
        await expect(Object.keys(state)).toEqual(["x"]);
    },

    "createState(): app picks up queued patches": async () => {
        const state: any = createState({ count: 0 });
        state.patch({ count: 1 });
        state.patch({ count: 2 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, state, () => [DIV]);

        await expect(state.count).toEqual(2);
    },

    "createState(): already-patchable state is kept as-is": async () => {
        const existingPatch = () => { };
        const stats: Stats = {
            asyncRenderCount: 0,
            asyncRenderPatchCount: 0,
            lastAsyncRenderTime: 0,
            lastSyncRenderTime: 0,
            liveEffectCount: 0,
            patchCount: 0,
            syncRenderCount: 0,
            syncRenderPatchCount: 0,
        };
        const state: any = { value: 5, patch: existingPatch, [$STATS]: stats };
        const result = createState(state);

        await expect(result.patch === existingPatch).toEqual(true);
        await expect(result[$STATS] === stats).toEqual(true);
    },

    "createState(): can be used with an <S> which is already a PatchableState": async () => {
        type StateType = {
            foo: string,
            bar: {
                a: number,
                b: number,
            },
        };
        type StatePatchable = PatchableState<StateType>;

        const st = createState<StateType>({
            foo: "test",
            bar: {
                a: 1,
                b: 2,
            },
        });

        const sp = createState<StatePatchable>({
            foo: "test",
            bar: {
                a: 1,
                b: 2,
            },
        });

        await expect(sp).toEqual(st);
    },
};
