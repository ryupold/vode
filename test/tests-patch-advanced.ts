import { delay, eventually, expect, setHidden } from "./helper";
import { app, ContainerNode, createState, DIV } from "../index";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container as unknown as ContainerNode;
}

export default {
    "patch(): generator function yields multiple state updates": async () => {
        const container = setup();
        const state = createState({ count: 0 });
        app(container, state, (s) => [DIV, String(s.count)]);

        await expect(state.count).toEqual(0);

        state.patch(function* () {
            yield { count: 1 };
            yield { count: 2 };
            return { count: 3 };
        });

        await new Promise(r => setTimeout(r, 0));

        await expect(state.count).toEqual(3);
        await expect(container).toMatch([DIV, "3"]);
    },

    "patch(): async generator yields over time": async () => {
        const container = setup();
        const state = createState({ phase: "start", value: 0 });
        app(container, state, (s) => [DIV, s.phase, String(s.value)]);

        await expect(state.phase).toEqual("start");

        state.patch(async function* () {
            await expect(container._vode.stats.syncRenderPatchCount).toEqual(0);
            yield { phase: "working", value: 10 };
            await expect(container._vode.stats.syncRenderPatchCount).toEqual(1);
            yield { phase: "almost", value: 20 };
            await expect(container._vode.stats.syncRenderPatchCount).toEqual(2);
            return { phase: "done", value: 30 };
        }());

        await new Promise(r => setTimeout(r, 0));

        await expect(state.phase).toEqual("done");
        await expect(state.value).toEqual(30);
        await expect(container).toMatch([DIV, "done", "30"]);
    },

    "patch(): Promise resolves and applies patch": async () => {
        const container = setup();
        const state = createState({ msg: "before" });
        app(container, state, (s) => [DIV, s.msg]);

        await state.patch(Promise.resolve({ msg: "after" }));

        await expect(state).toEqual({ msg: "after" });
        await expect(container).toMatch([DIV, "after"]);
    },

    "patch(): array with empty patches applies nothing": async () => {
        const container = setup();
        const state = createState({ x: 1, y: 2 });
        app(container, state, (s) => [DIV]);

        await state.patch([{}, {}]);

        await delay(10);
        await expect(state).toEqual({ x: 1, y: 2 });
    },

    "patch(): array with null/undefined items skips them": async () => {
        const container = setup();
        const state = createState({ x: 0, y: 0 });
        app(container, state, (s) => [DIV, String(s.x), String(s.y)]);

        state.patch([null, { x: 10 }, undefined, { y: 20 }]);

        await eventually(() => state.x).toEqual(10);
        await eventually(() => state.y).toEqual(20);
    },

    "patch(): returns Promise for generator functions, can be awaited": async () => {
        const container = setup();
        const state = createState({ count: 0 });
        app(container, state, (s) => [DIV, String(s.count)]);

        await expect(container._vode.stats.patchCount).toEqual(0);
        const result = state.patch(function* () {
            yield { count: 1 };
            return { count: 2 };
        });
        await expect(container._vode.stats.patchCount).toEqual(1);

        expect(result).toBeA("object");
        await expect(result instanceof Promise).toEqual(true);

        await result;
        await expect(container._vode.stats.patchCount).toEqual(3);

        await expect(state.count).toEqual(2);
        await expect(container).toMatch([DIV, "2"]);
    },

    "patch(): returns Promise for Promise patches, can be awaited": async () => {
        const container = setup();
        const state = createState({ msg: "before" });
        app(container, state, (s) => [DIV, s.msg]);

        const result = state.patch(Promise.resolve({ msg: "after" }));

        expect(result).toBeA("object");
        await expect(result instanceof Promise).toEqual(true);

        await result;

        await expect(state.msg).toEqual("after");
        await expect(container).toMatch([DIV, "after"]);
    },

    "patch(): returns void for object patches": async () => {
        const container = setup();
        const state = createState({ x: 1 });
        app(container, state, (s) => [DIV, String(s.x)]);

        const result = state.patch({ x: 2 });

        expect(result).toBeA("undefined");

        await expect(state.x).toEqual(2);
        await expect(container).toMatch([DIV, "2"]);
    },

    "patch(): forward promise error when one happens during patch": async () => {
        const container = setup();
        const state = createState({ msg: "before" });
        app(container, state, (s) => [DIV, s.msg]);

        const mockPromise = Promise.withResolvers<void>();
        const promisePatchResult = state.patch(mockPromise.promise);
        mockPromise.reject(new Error("promise error"));

        let err = await expect(() => promisePatchResult)
            .toFailAsync("promise (1) error expected");
        expect(err.message).toEqual("promise error");

        err = await expect(() => state.patch(async () => {
            await delay(1);
            throw new Error("promise error")
        })).toFailAsync("promise (2) error expected");
        expect(err.message).toEqual("promise error");
    },

    "patch(): forward generator error when one happens during patch": async () => {
        const container = setup();
        const state = createState({ msg: "before" });
        app(container, state, (s) => [DIV, s.msg]);

        const err = await expect(
            () => state.patch(
                async function* () {
                    yield {};
                    await delay(1);
                    yield {};
                    throw new Error("generator error");
                }
            )
        ).toFailAsync("generator error expected");
        expect(err.message).toEqual("generator error");
    },
    "patch(): forward error when one happens during patch": async () => {
        const container = setup();
        const state = createState({ msg: "before" });
        app(container, state, (s) => [DIV, s.msg]);

        const err = await expect(
            () => state.patch(
                () => {
                    throw new Error("void error");
                }
            )
        ).toFailAsync("void error expected");
        expect(err.message).toEqual("void error");
    },

    "patch(): animated patch while document is hidden": async () => {
        const container = setup();
        const state = createState({ x: 0 });
        app(container, state, (s) => [DIV, String(s.x)]);

        setHidden(true);
        
        try {
            state.patch({ x: 1 }, true);

            // state is applied immediately and the animated queue is drained
            await eventually(() => state.x).toEqual(1);
            await eventually(() => container._vode.qAsync == null).toEqual(true);
        } finally {
            setHidden(false);
        }
    },

    "patch(): app() dispatch forwards the animate flag": async () => {
        const container = setup();
        const state = createState({ x: 0 });
        const dispatch = app(container, state, (s) => [DIV, String(s.x)]);

        await expect(container._vode.stats.asyncRenderPatchCount).toEqual(0);

        // animated dispatch via the returned function must route through the view-transition path
        dispatch({ x: 1 }, true);
        await expect(container._vode.stats.asyncRenderPatchCount).toEqual(1);

        // the animated path merges the queued value into state and drains the async queue
        await eventually(() => state.x).toEqual(1);
        await eventually(() => container._vode.qAsync == null).toEqual(true);

        // a non-animated dispatch must stay on the sync path (async count unchanged)
        const syncBefore = container._vode.stats.syncRenderPatchCount;
        dispatch({ x: 2 });
        await expect(container._vode.stats.asyncRenderPatchCount).toEqual(1);
        await expect(container._vode.stats.syncRenderPatchCount).toEqual(syncBefore + 1);

        await eventually(() => state.x).toEqual(2);
        await expect(container).toMatch([DIV, "2"]);
    },

    "patch(): patch animated while hidden renders once visible again": async () => {
        const container = setup();
        const state = createState({ x: 0 });
        app(container, state, (s) => [DIV, String(s.x)]);

        await expect(container).toMatch([DIV, "0"]);

        setHidden(true);

        try {
            // documented view-transition patch (array) issued while the tab is hidden
            state.patch([{ x: 1 }]);

            // state already reflects the change (render is deferred while hidden in the fake DOM)
            await eventually(() => state.x).toEqual(1);
        } finally {
            // becoming visible again flushes the deferred render to the DOM
            setHidden(false);
        }

        await expect(container).toMatch([DIV, "1"]);
    },
};
