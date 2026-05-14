import { expect } from "./helper";
import { createState, app, DIV } from "../index";

export default {
    "createState(): throws when state is not an object": () => {
        const err = expect(() => createState(null as any)).toFail();
        expect(err.message)
            .toEqual("createState() must be called with a state object");
    },

    "createState(): adds patch function to state": () => {
        const state = createState({ x: 1 });
        expect(typeof (state as any).patch).toEqual("function");
        expect((state)).toEqual({ x: 1, patch: (state as any).patch });
    },

    "createState(): patch is non-enumerable": () => {
        const state = createState({ x: 1 });
        expect(Object.keys(state)).toEqual(["x"]);
    },

    "createState(): app picks up queued patches": () => {
        const state: any = createState({ count: 0 });
        state.patch({ count: 1 });
        state.patch({ count: 2 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, state, () => [DIV]);

        expect(state.count)
            .toEqual(2);
    },

    "createState(): already-patchable state is kept as-is": () => {
        const existingPatch = (action: any) => { };
        const state: any = { value: 5, patch: existingPatch };
        const result = createState(state);

        expect(result.patch === existingPatch)
            .toEqual(true);
    },
};
