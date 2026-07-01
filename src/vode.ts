export type Vode<S = PatchableState> = FullVode<S> | JustTagVode | NoPropsVode<S>;
export type FullVode<S = PatchableState> = [tag: Tag, props: Props<S> | ChildVode<S>, ...children: ChildVode<S>[]];
export type NoPropsVode<S = PatchableState> = [tag: Tag, ...children: ChildVode<S>[]] | (TextVode[]);
export type JustTagVode = [tag: Tag];
export type ChildVode<S = PatchableState> = Vode<S> | TextVode | NoVode | Component<S>;
export type TextVode = string & {};
export type NoVode = undefined | null | number | boolean | bigint | void;
export type Tag = keyof (HTMLElementTagNameMap & SVGElementTagNameMap & MathMLElementTagNameMap) | (string & {});
export type Component<S = PatchableState> = (s: S) => ChildVode<S>;
export type DomElement = HTMLElement | SVGSVGElement | MathMLElement;

type AttachedVode<S = PatchableState> = AttachedElementVode<S> | Text & { [NODE]?: never };
type AttachedElementVode<S> = Vode<S> & { [NODE]: ElementNode<S>, [UNMOUNT_COUNT]?: number };
type ElementNode<S> = HTMLElement & SVGSVGElement & MathMLElement & Record<string, PropertyValue<S>>;
type MemoNode<S> = ChildVode<S> & { [MEMO]?: unknown[] }

/** can be used to access the internal vode meta data of a ContainerNode */
export const VODE = Symbol("vode");
/** can be used to access the ElementNode of an AttachedVode */
export const NODE = Symbol("node");
const UNMOUNT_COUNT = Symbol("ucount");
const MEMO = Symbol("memo");

export type Patch<S> =
    | IgnoredPatch // ignored
    | RenderPatch<S> // updates state, causes render
    | Promise<Patch<S>> | Effect<S>; // is executed, awaited, results in patches

export type IgnoredPatch = undefined | null | number | boolean | bigint | string | symbol | void;
export type RenderPatch<S> = {} | DeepPartial<S>;
export type DeepPartial<S> = { [P in keyof S]?: S[P] extends Array<infer I> ? Array<DeepPartial<I>> : DeepPartial<S[P]> };

export type Effect<S> =
    | (() => Patch<S>)
    | EventFunction<S>
    | Generator<Patch<S>>
    | AsyncGenerator<Patch<S>>;

export type EventFunction<S = PatchableState, E extends Event = Event> = (state: S, evt: E) => Patch<S>;
export type EventProp<S = PatchableState, E extends Event = Event> = EventFunction<S, E> | Patch<S>;

export interface Props<S = PatchableState> extends Partial<
    Omit<HTMLElement,
        keyof (DocumentFragment & ElementCSSInlineStyle & GlobalEventHandlers)> &
    { [K in keyof EventsMap]: EventProp<S, EventsMap[K]> } // all on* events, evt typed per event
> {
    [_: string]: unknown,
    xmlns?: string | null,
    class?: ClassProp,
    style?: StyleProp,
    /** called after the element was attached */
    onMount?: MountFunction<S> | null | false,
    /** called before the element is detached */
    onUnmount?: MountFunction<S> | null | false,
    /** used instead of original vode when an error occurs during rendering */
    catch?: ((s: S, error: Error) => ChildVode<S>) | ChildVode<S>;
    /** called on every render */
    onRender?: ((s: S, vode: AttachedElementVode<S>) => void) | null | false;
};

export type MountFunction<S> =
    | ((s: S, node: HTMLElement) => Patch<S>)
    | ((s: S, node: SVGSVGElement) => Patch<S>)
    | ((s: S, node: MathMLElement) => Patch<S>);

export type ClassProp =
    | string // "class1 class2"
    | string[] // ["class1", "class2"]
    | Record<string, boolean | undefined | null> // { class1: true, class2: false }
    | "" | false | null | undefined; // no class

export type StyleProp =
    | string
    | (Record<number, never> & { [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K] | null })
    | "" | false | null | undefined; // no style

type EventsMapBase =
    & { [K in keyof HTMLElementEventMap as `on${K}`]: HTMLElementEventMap[K] }
    & { [K in keyof SVGElementEventMap as `on${K}`]: SVGElementEventMap[K] }
    & { [K in keyof MathMLElementEventMap as `on${K}`]: MathMLElementEventMap[K] };

export interface EventsMap extends EventsMapBase { }

export type PropertyValue<S> =
    | string | boolean | null | undefined | void
    | StyleProp | ClassProp
    | Patch<S>;

export type Dispatch<S> = (action: Patch<S>, animated?: boolean) => void | Promise<void>;
export interface Patchable<S = object> { patch: Dispatch<S>; }
export type PatchableState<S = object> = S & Patchable<S>;
export type AsPatchable<S> = S extends { patch: any } ? S : PatchableState<S>;
type PreparedState<S> = { patch: { initialPatches: Patch<S>[] } };

export type ContainerNode<S = PatchableState> = DomElement & {
    /** the `VODE` (symbol) property is added to the container in `app()`.
     * it contains all necessary stuff for the vode app to function.
     * remove the container node to clear vode's resources */
    [VODE]: {
        state: PatchableState<S>,
        vode: AttachedVode<S>,
        document: Document & { currentViewTransition?: ViewTransition | null },
        renderSync: () => void,
        renderAsync: () => Promise<unknown>,
        syncRenderer: (cb: () => void) => void,
        asyncRenderer: ((cb: () => void) => ViewTransition) | null,
        qAsync: {} | undefined | null,  // next render-patches to be animated after another
        isRendering: number,
        isAnimating: boolean,
        /** stats about the overall patches & last render time */
        stats: {
            patchCount: number,
            liveEffectCount: number,
            syncRenderPatchCount: number,
            asyncRenderPatchCount: number,
            syncRenderCount: number,
            asyncRenderCount: number,
            lastSyncRenderTime: number,
            lastAsyncRenderTime: number,
        },
    }
};
const ELEMENT_NODE = 1, TEXT_NODE = 3;

/** type-safe way to create a vode. useful for type inference and autocompletion.
 *
 * - just a tag: `vode("div")` => `["div"]` --*rendered*-> `<div></div>`
 * - tag and props: `vode("div", { class: "foo" })` => `["div", { class: "foo" }]` --*rendered*-> `<div class="foo"></div>`
 * - tag, props and children: `vode("div", { class: "foo" }, ["span", "bar"])` => `["div", { class: "foo" }, ["span", "bar"]]` --*rendered*-> `<div class="foo"><span>bar</span></div>`
 * - identity: `vode(["div", ["span", "bar"]])` => `["div", ["span", "bar"]]` --*rendered*-> `<div><span>bar</span></div>`
 */
export function vode<S = PatchableState>(tag: Tag | Vode<S>, props?: Props<S> | ChildVode<S>, ...children: ChildVode<S>[]): Vode<S> {
    if (!tag) throw new Error("first argument to vode() must be a tag name or a vode");

    if (Array.isArray(tag))
        return tag;
    else if (props !== null && typeof props === "object")
        return [tag, props as Props<S>, ...children];
    else if (props === undefined)
        return [tag, ...children];
    else
        return [tag, props as ChildVode<S>, ...children];
}

/** create a vode app inside a container element
 * @param container will use this container as root and places the result of the dom function and further renderings in it
 * @param state the state object that is used as singleton state bound to the vode app and is updated with `patch()`. its type is inferred, so the `dom` function and the returned `patch` are typed without annotations.
 * @param dom function is called every render and returns the vode-dom that is updated incrementally to the DOM based on the state.
 * @param initialPatches variadic list of patches that are applied after the first render
 * @returns a patch function that can be used to update the state
 */
export function app<S extends object = PatchableState>(
    container: DomElement,
    state: S,
    dom: (s: AsPatchable<S>) => Vode<AsPatchable<S>>,
    ...initialPatches: Patch<AsPatchable<S>>[]
): Dispatch<AsPatchable<S>>;
export function app<S extends PatchableState = PatchableState>(
    container: DomElement,
    state: Omit<S, "patch">,
    dom: (s: S) => Vode<S>,
    ...initialPatches: Patch<S>[]
): Dispatch<S> {
    if (!container?.parentElement) throw new Error("first argument to app() must be a valid HTMLElement inside the <html></html> document");
    if (!state || typeof state !== "object") throw new Error("second argument to app() must be a state object");
    if (typeof dom !== "function") throw new Error("third argument to app() must be a function that returns a vode");

    const _vode = {} as ContainerNode<S>[typeof VODE];
    _vode.document = container.ownerDocument;
    const win = _vode.document.defaultView;
    _vode.syncRenderer = win?.requestAnimationFrame
        ? win.requestAnimationFrame.bind(win)
        : function (cb: FrameRequestCallback) {
            const t = performance.now();
            cb(t);
            return t;
        };
    _vode.asyncRenderer = typeof _vode.document.startViewTransition === "function"
        ? _vode.document.startViewTransition.bind(_vode.document)
        : null;
    _vode.isRendering = 0;
    _vode.qAsync = null;
    _vode.stats = { lastSyncRenderTime: 0, lastAsyncRenderTime: 0, syncRenderCount: 0, asyncRenderCount: 0, liveEffectCount: 0, patchCount: 0, syncRenderPatchCount: 0, asyncRenderPatchCount: 0 };

    const patchableState = state as PatchableState<S> & { patch: (action: Patch<S>, animate?: boolean) => void | Promise<void> };

    if ("patch" in state && typeof state.patch === "function" && Array.isArray((state as PreparedState<S>).patch.initialPatches)) {
        initialPatches = [...(state as unknown as PreparedState<S>).patch.initialPatches, ...initialPatches];
    }

    async function promisePatch(action: Promise<Patch<S>>, animated?: boolean) {
        _vode.stats.liveEffectCount++;
        try {
            const resolvedPatch = await (action as Promise<Patch<S>>);
            await patchableState.patch(resolvedPatch, animated);
        } finally {
            _vode.stats.liveEffectCount--;
        }
    }

    async function generatorPatch(action: AsyncGenerator<Patch<S>>, animated?: boolean) {
        const generator = action as AsyncGenerator<Patch<S>>;
        _vode.stats.liveEffectCount++;
        try {
            let v = await generator.next();
            while (v.done === false) {
                _vode.stats.liveEffectCount++;
                try {
                    await patchableState.patch(v.value, animated);
                    v = await generator.next();
                } finally {
                    _vode.stats.liveEffectCount--;
                }
            }
            await patchableState.patch(v.value as Patch<S>, animated);
        } finally {
            _vode.stats.liveEffectCount--;
        }
    }

    Object.defineProperty(state, "patch", {
        enumerable: false, configurable: true,
        writable: false, value: (action: Patch<S>, animated?: boolean): void | Promise<void> => {
            while (typeof action === "function") {
                action = (<(s: S) => unknown>action)(_vode.state);
            }

            if (!action || typeof action !== "object") return;

            _vode.stats.patchCount++;

            if (typeof (action as AsyncGenerator<Patch<S>>).next === "function") {
                return generatorPatch(action as AsyncGenerator<Patch<S>>, animated);
            } else if (typeof (action as Promise<S>).then === "function") {
                return promisePatch(action as Promise<S>, animated);
            } else if (Array.isArray(action)) {
                if (action.length > 0) {
                    for (const p of action) {
                        patchableState.patch(p, !!_vode.asyncRenderer);
                    }
                } else {
                    // when an empty array is patched: skip the current animation, merge all queued async patches into state, and schedule a sync render
                    mergeState(_vode.state as Record<string, unknown>, _vode.qAsync, true);
                    _vode.qAsync = null;
                    try { _vode.document.currentViewTransition?.skipTransition(); } catch { }
                    _vode.stats.syncRenderPatchCount++;
                    _vode.renderSync();
                }
            } else {
                if (animated && !!_vode.asyncRenderer) {
                    _vode.stats.asyncRenderPatchCount++;
                    _vode.qAsync = mergeState(_vode.qAsync || {}, action, false);
                    _vode.renderAsync();
                } else {
                    _vode.stats.syncRenderPatchCount++;
                    mergeState(_vode.state as Record<string, unknown>, action, true);
                    _vode.renderSync();
                }
            }
        }
    });

    function renderDom(animated: boolean) {
        const sw = performance.now();
        _vode.vode = render<S>(_vode.state, container.parentElement as DomElement, 0, 0, _vode.vode, dom)!;

        if ((<ContainerNode<S>>container).tagName.toLowerCase() !== (<Vode<S>>_vode.vode)[0].toLowerCase()) {
            // the tag name was changed during render -> update reference to vode-app-root
            container = _vode.vode[NODE] as DomElement;
            (<ContainerNode<S>>container)[VODE] = _vode;
        }

        if (!animated) {
            _vode.stats.lastSyncRenderTime = performance.now() - sw;
            const changesSinceRender = _vode.isRendering !== _vode.stats.syncRenderPatchCount;
            _vode.stats.syncRenderCount++;
            _vode.isRendering = 0;
            if (changesSinceRender)
                _vode.renderSync();
        }
    }
    const sr = renderDom.bind(null, false);
    const ar = renderDom.bind(null, true);

    Object.defineProperty(_vode, "renderSync", {
        enumerable: false, configurable: true,
        writable: false, value: () => {
            if (_vode.isRendering) return;

            _vode.isRendering = _vode.stats.syncRenderPatchCount;
            _vode.syncRenderer(sr);
        }
    });

    Object.defineProperty(_vode, "renderAsync", {
        enumerable: false, configurable: true,
        writable: false, value: async () => {
            if (_vode.isAnimating || !_vode.qAsync) return;
            await _vode.document.currentViewTransition?.updateCallbackDone; // wait for previous VT to complete
            if (_vode.isAnimating || !_vode.qAsync) return;

            if (_vode.document.hidden) {
                _vode.state = mergeState(_vode.state as Record<string, unknown>, _vode.qAsync, true) as PatchableState<S>;
                _vode.qAsync = null;
                _vode.stats.syncRenderPatchCount++;
                _vode.renderSync();
                return;
            }

            _vode.isAnimating = true;
            const sw = performance.now();
            try {
                _vode.state = mergeState(_vode.state as Record<string, unknown>, _vode.qAsync, true) as PatchableState<S>;
                _vode.qAsync = null;

                if (_vode.asyncRenderer) {
                    _vode.document.currentViewTransition = _vode.asyncRenderer(ar);
                } else {
                    _vode.renderSync();
                    return;
                }

                await _vode.document.currentViewTransition?.updateCallbackDone;
            } finally {
                _vode.stats.lastAsyncRenderTime = performance.now() - sw;
                _vode.stats.asyncRenderCount++;
                _vode.isAnimating = false;
            }
            if (_vode.qAsync) _vode.renderAsync();
        }
    });

    _vode.state = patchableState;

    const root = container as ContainerNode<S>;
    root[VODE] = _vode;
    const indexInParent = Array.from(container.parentElement.children).indexOf(container);

    const patchCountBefore = _vode.stats.syncRenderPatchCount;
    _vode.isRendering = _vode.stats.syncRenderPatchCount;
    _vode.vode = render(
        <S>state,
        container.parentElement,
        indexInParent,
        indexInParent,
        hydrate<S>(container, true) as AttachedVode<S>,
        dom
    )!;

    // if during initial render the tag of the root vode was changed (catch or different Tag)
    if (container.tagName.toLowerCase() !== (<Vode<S>>_vode.vode)[0].toLowerCase()) {
        container = _vode.vode[NODE]!;
        (container as ContainerNode<S>)[VODE] = _vode;
    }

    const continueRendering = _vode.stats.syncRenderPatchCount !== patchCountBefore;
    _vode.isRendering = 0;
    _vode.stats.syncRenderCount++;
    if (continueRendering) _vode.renderSync();

    for (const effect of initialPatches) {
        patchableState.patch(effect);
    }

    return (action: Patch<S>, animated?: boolean) => patchableState.patch(action, animated);
}

/** unregister vode app from container and free resources
 * of all vodes inside the container.
 * removes all event listeners registered by vode
 * removes patch function from state object
 * leaves the DOM as is
 */
export function defuse(container: ContainerNode) {
    if (container?.[VODE]) {
        function clearEvents(av: AttachedVode) {
            if (!av?.[NODE]) return;

            const p = props(av);
            if (p) {
                for (const key in p) {
                    if (key[0] === "o" && key[1] === "n") {
                        (av[NODE])[key] = null;
                    }
                }
                av[NODE].catch = null;
            }

            if ((av[NODE] as unknown as ContainerNode)[VODE]) {
                defuse(av[NODE] as unknown as ContainerNode);
            } else {
                const kids = children(av);
                if (kids) {
                    for (let child of kids) {
                        clearEvents(child as AttachedVode);
                    }
                }
            }
        }

        const v = container[VODE];
        delete (container as Partial<ContainerNode>)[VODE];
        Object.defineProperty(v.state, "patch", { value: undefined });
        Object.defineProperty(v, "renderSync", { value: () => { } });
        Object.defineProperty(v, "renderAsync", { value: () => { } });
        clearEvents(v.vode);
    } else {
        for (let child of container.children) {
            defuse(child as ContainerNode<PatchableState>);
        }
    }
}

/** return vode representation of given DOM node */
export function hydrate<S = PatchableState>(element: DomElement | Text): Vode<S> | string | undefined;
export function hydrate<S = PatchableState>(element: DomElement | Text, prepareForRender: boolean): AttachedVode<S> | undefined;
export function hydrate<S = PatchableState>(element: DomElement | Text, prepareForRender?: boolean): Vode<S> | string | AttachedVode<S> | undefined {
    if ((element as Text)?.nodeType === TEXT_NODE) {
        if ((element as Text).nodeValue?.trim() !== "")
            return prepareForRender ? element as Text : (element as Text).nodeValue!;
        return undefined; //ignore (mostly html whitespace)
    }
    else if (element.nodeType === ELEMENT_NODE) {
        const tag: Tag = (<Element>element).tagName.toLowerCase();
        const root = [tag] as unknown as FullVode<S>;

        if (prepareForRender) (<AttachedElementVode<S>>root)[NODE] = element as ElementNode<S>;
        if ((element as HTMLElement)?.hasAttributes()) {
            const props: Props<S> = {};
            const attr = (<HTMLElement>element).attributes;
            for (let a of attr) {
                props[a.name] = a.value;
            }
            root.push(props);
        }
        if (element.hasChildNodes()) {
            const remove: ChildNode[] = [];
            for (let child of element.childNodes) {
                const wet = child && hydrate<S>(child as DomElement | Text, !!prepareForRender)! as ChildVode<S>;
                if (wet) root.push(wet);
                else if (child && prepareForRender) remove.push(child);
            }
            for (let child of remove) {
                child.remove();
            }
        }
        return root;
    } else {
        return undefined;
    }
}

/** memoizes the resulting component or props by comparing element by element (===) with the
 * `compare` of the previous render. otherwise skips the render step (not calling `componentOrProps`)
 */
export function memo<S = PatchableState>(compare: unknown[], component: Component<S>): Component<S> {
    if (!compare || !Array.isArray(compare)) throw new Error("first argument to memo() must be an array of values to compare");
    if (typeof component !== "function") throw new Error("second argument to memo() must be a function that returns a child vode");

    if ((<MemoNode<S>>component)[MEMO]) { // wrap to prevent double memoization
        const comp = component;
        component = (s: S) => comp(s);
    }

    (<MemoNode<S>>component)[MEMO] = compare;

    return component;
}

/** 
 * create a patchable state object for a vode-app.
 * calls to `patch()` prior to `app()` initialization will queue the patches and apply them before the initial patches.
 * calls to `patch()` after `app()` initialization will apply the patch immediately and trigger a render as usual. 
 */
export function createState<S = PatchableState>(state: S): PatchableState<S> {
    if (!state || typeof state !== "object") throw new Error("createState() must be called with a state object");

    if (!("patch" in state)) {
        Object.defineProperty(state, "patch", {
            enumerable: false, configurable: true,
            writable: false, value: (action: Patch<S>, animated?: boolean) => {
                const futureState = state as unknown as PreparedState<S>;
                if (!Array.isArray(futureState.patch.initialPatches)) {
                    futureState.patch.initialPatches = [];
                }
                futureState.patch.initialPatches.push(animated ? [action] : action);
            }
        });
    }

    return state as PatchableState<S>;
}

/** type safe way to create a patch. useful for type inference and autocompletion. */
export function createPatch<S = PatchableState>(p: DeepPartial<S> | Effect<S> | IgnoredPatch): typeof p { return p; }

/** HTML tag of the vode or undefined if it has none or is a text node */
export function tag(v: ChildVode): Tag | undefined {
    const t = !!v && Array.isArray(v) && v[0] as Tag;
    if (typeof t === "string") return t;
    return undefined;
}

/** get properties object of a vode, if there is any */
export function props<S = PatchableState>(vode: ChildVode<S> | AttachedVode<S>): Props<S> | undefined {
    if (Array.isArray(vode)
        && vode.length > 1
        && vode[1]
        && !Array.isArray(vode[1])
    ) {
        if (
            typeof vode[1] === "object"
            && (vode[1] as unknown as Node).nodeType !== TEXT_NODE
        ) {
            return vode[1];
        }
    }

    return undefined;
}

/** get a slice of all children of a vode, if there are any */
export function children<S = PatchableState>(vode: ChildVode<S> | AttachedVode<S>): ChildVode<S>[] | undefined {
    const start = childrenStart(vode);
    if (start > 0) {
        return (<Vode<S>>vode).slice(start) as Vode<S>[];
    }
    return undefined;
}

export function childCount<S = PatchableState>(vode: Vode<S>) {
    const start = childrenStart(vode);
    if (start < 0) return 0;
    return vode.length - start;
}

export function child<S = PatchableState>(vode: Vode<S>, index: number): ChildVode<S> | undefined {
    const start = childrenStart(vode);
    if (start > 0) return vode[index + start] as ChildVode<S>;
    else return undefined;
}

/** index in vode at which child-vodes start */
export function childrenStart<S = PatchableState>(vode: ChildVode<S> | AttachedVode<S>): 1 | 2 | -1 {
    return props(vode) ? (<Vode>vode).length > 2 ? 2 : -1 : (Array.isArray(vode) && vode.length > 1 ? 1 : -1);
}

function mergeState(target: Record<string, unknown>, source: Record<string, unknown> | unknown | null | undefined, allowDeletion: boolean) {
    if (typeof source !== "object") return target;

    for (const key in source) {
        const value = (<Record<string, unknown>>source)[key];
        if (value && typeof value === "object") {
            const proto = Object.getPrototypeOf(value);
            if (proto !== Object.prototype && proto !== null) {
                target[key] = value;
            } else {
                const targetValue = target[key];
                if (targetValue) {
                    if (Array.isArray(targetValue))
                        target[key] = mergeState({}, value, allowDeletion);
                    else if (typeof targetValue === "object")
                        mergeState(target[key] as Record<string, unknown>, value, allowDeletion);
                    else
                        target[key] = mergeState({}, value, allowDeletion);
                } else {
                    target[key] = mergeState({}, value, allowDeletion);
                }
            }
        }
        else if (value === undefined && allowDeletion) {
            delete target[key];
        }
        else {
            target[key] = value;
        }
    }
    return target;
}

function render<S extends PatchableState>(state: S, parent: DomElement, childIndex: number, indexInParent: number, oldVode: AttachedVode<S> | undefined, newVode: ChildVode<S>, xmlns?: string | null): AttachedVode<S> | undefined {
    try {
        // unwrap component if it is memoized
        newVode = remember(state, newVode as MemoNode<S>, oldVode as MemoNode<S>) as ChildVode<S>;

        const isNoVode = !newVode || typeof newVode === "number" || typeof newVode === "boolean" || typeof newVode === "bigint";
        if (newVode === oldVode || (!oldVode && isNoVode)) {
            return oldVode;
        }

        const oldIsText = (oldVode as Text)?.nodeType === TEXT_NODE;
        const oldNode = oldIsText
            ? oldVode as Text
            : oldVode?.[NODE];

        // falsy|text|element(A) -> undefined 
        if (isNoVode) {
            if (oldNode) {
                unmountTree(state, oldVode as ChildVode<S>);
                oldNode.remove();
            }
            return undefined;
        }

        const isText = !isNoVode && isTextVode(newVode);
        const isNode = !isNoVode && isNaturalVode(newVode);
        const alreadyAttached = !!newVode && typeof newVode !== "string" && !!((<AttachedVode<S>>newVode)?.[NODE] || (<Text><AttachedVode<S>>newVode)?.nodeType === TEXT_NODE);

        if (!isText && !isNode && !alreadyAttached && !oldVode) {
            throw new Error(`invalid ChildVode at index ${childIndex}: typeof ${typeof newVode}${typeof newVode === "object" ? "\ncould be that you are adding Props at the wrong position?" : ""}`);
        }
        else if (alreadyAttached && isText) {
            newVode = (<Text><AttachedVode<S>>newVode).wholeText;
        }
        else if (alreadyAttached && isNode) {
            newVode = [...<Vode<S>>newVode];
        }

        // text -> text
        if (oldIsText && isText) {
            if ((<Text>oldNode).nodeValue !== <string>newVode) {
                (<Text>oldNode).nodeValue = <string>newVode;
            }
            return oldVode;
        }
        // falsy|element -> text
        if (isText && (!oldNode || !oldIsText)) {
            const text = parent.ownerDocument.createTextNode(newVode as string);
            if (oldNode) {
                unmountTree(state, oldVode as ChildVode<S>);
                oldNode.replaceWith(text);
            } else {
                let inserted = false;
                for (let i = indexInParent; i < parent.childNodes.length; i++) {
                    const nextSibling = parent.childNodes[i];
                    if (nextSibling) {
                        nextSibling.before(text);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    parent.appendChild(text);
                }
            }
            return text as Text;
        }

        // falsy|text|element(A) -> element(B) 
        if (
            (isNode && (!oldNode || oldIsText || (<Vode<S>>oldVode)[0] !== (<Vode<S>>newVode)[0]))
        ) {
            const newvode = <Vode<S>>newVode;
            if (1 in newvode) {
                newvode[1] = remember(state, newvode[1] as MemoNode<S>, undefined) as Vode<S>;
            }

            const properties = props(newVode);

            if (properties?.xmlns !== undefined) xmlns = properties.xmlns;

            const newNode = <ElementNode<S>>(
                xmlns
                    ? parent.ownerDocument.createElementNS(xmlns, (<Vode<S>>newVode)[0])
                    : parent.ownerDocument.createElement((<Vode<S>>newVode)[0])
            );
            (<AttachedVode<S>>newVode)[NODE] = newNode;

            //set properties for new child in xml mode to prevent using the dom properties
            patchProperties(state, newNode, undefined, properties, xmlns ?? null);

            if (!!properties && "catch" in properties) {
                (<AttachedElementVode<S>>newVode)[NODE]["catch"] = null;
                (<AttachedElementVode<S>>newVode)[NODE].removeAttribute("catch");
            }

            if (oldNode) {
                unmountTree(state, oldVode as AttachedElementVode<S>);
                oldNode.replaceWith(newNode);
            } else {
                let inserted = false;
                for (let i = indexInParent; i < parent.childNodes.length; i++) {
                    const nextSibling = parent.childNodes[i];
                    if (nextSibling) {
                        nextSibling.before(newNode);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    parent.appendChild(newNode);
                }
            }

            const newStart = childrenStart(newVode);
            if (newStart > 0) {
                let indexP = 0;
                for (let i = 0; i < (<Vode<S>>newVode).length - newStart; i++) {
                    const child = (<Vode<S>>newVode)[i + newStart] as ChildVode<S>;
                    // render child in xml mode to prevent using the dom properties
                    const attached = render(state, newNode, i, indexP, undefined, child, xmlns ?? null);
                    (<Vode<S>>newVode!)[i + newStart] = <Vode<S>>attached;
                    if (attached) indexP++;
                }
            }

            (<AttachedElementVode<S>>newVode)[UNMOUNT_COUNT] = (properties?.onUnmount ? 1 : 0) + sumChildUnmountCounts(<AttachedElementVode<S>>newVode);
            if (typeof properties?.onMount === "function") {
                state.patch(properties.onMount(state, newNode as HTMLElement & SVGSVGElement & MathMLElement));
            }
            if (typeof properties?.onRender === "function") {
                properties.onRender(state, <AttachedElementVode<S>>newVode);
            }
            return <AttachedVode<S>>newVode;
        }

        //element(A) -> element(A) 
        if (!oldIsText && isNode && (<Vode<S>>oldVode)[0] === (<Vode<S>>newVode)[0]) {
            const node = oldNode as ElementNode<S>;
            (<AttachedElementVode<S>>newVode)[NODE] = node;

            const properties = props(newVode);
            const oldProps = props(oldVode);

            if (properties?.xmlns !== undefined)
                xmlns = properties.xmlns;

            patchProperties(state, node, oldProps, properties, xmlns);

            if (!!properties?.catch && oldProps?.catch !== properties.catch) {
                node["catch"] = null;
                node.removeAttribute("catch");
            }

            const newStart = childrenStart(newVode);
            const oldStart = childrenStart(oldVode);
            if (newStart > 0) {
                let indexP = 0;
                for (let i = 0; i < (<Vode<S>>newVode).length - newStart; i++) {
                    const child = (<Vode<S>>newVode)[i + newStart] as ChildVode<S>;
                    const oldChild = oldStart > 0 ? (<Vode<S>>oldVode)[i + oldStart] as AttachedVode<S> : undefined;

                    const attached = render(state, oldNode as DomElement, i, indexP, oldChild, child, xmlns);
                    (<AttachedElementVode<S>>newVode)[i + newStart] = attached as Vode<S>;
                    if (attached) indexP++;
                }
            }

            if (oldStart > 0) {
                const newKidsCount = newStart > 0 ? (<Vode<S>>newVode).length - newStart : 0;
                for (let i = (<Vode<S>>oldVode).length - 1 - oldStart; i >= newKidsCount; i--) {
                    render(state, oldNode as DomElement, i, i, (<AttachedElementVode<S>>oldVode)[i + oldStart] as AttachedVode<S>, undefined, xmlns);
                }
            }

            (<AttachedElementVode<S>>newVode)[UNMOUNT_COUNT] = (properties?.onUnmount ? 1 : 0) + sumChildUnmountCounts(<AttachedElementVode<S>>newVode);
            if (typeof properties?.onRender === "function") {
                properties.onRender(state, <AttachedElementVode<S>>newVode);
            }
            return <AttachedVode<S>>newVode;
        }
    } catch (error: any) {
        const oldProps = props(oldVode);
        const newProps = props(newVode);

        const catchVode = typeof newVode === "function"
            ? oldProps?.catch
            : newProps?.catch;
        if (catchVode) {
            const catchNode = (<AttachedVode<S>>newVode)?.[NODE] || oldVode?.[NODE];
            if (!catchNode) throw error;

            const handledVode = typeof catchVode === "function"
                ? (<(s: S, error: Error) => ChildVode<S>>catchVode)(state, error)
                : catchVode;

            if (Array.isArray(newVode) && (<AttachedElementVode<S>>newVode)[NODE]) {
                const partialCount = (newProps?.onUnmount ? 1 : 0) + sumChildUnmountCounts(<AttachedElementVode<S>>newVode);
                if (partialCount > 0) {
                    (<AttachedElementVode<S>>newVode)[UNMOUNT_COUNT] = partialCount;
                    unmountTree(state, <AttachedElementVode<S>>newVode);
                }
            }

            while (catchNode.firstChild) (catchNode.firstChild as ChildNode).remove();

            const errorUi = render(state, parent, childIndex, indexInParent,
                hydrate(catchNode, true) as AttachedVode<S>,
                handledVode,
                xmlns);

            // reused catchNode's DOM node. fire onMount if it has one
            if ((<AttachedElementVode<S>>errorUi)?.[NODE] === catchNode) {
                const errorUiProps = props(errorUi as AttachedVode<S>);
                if (typeof errorUiProps?.onMount === "function") {
                    state.patch(errorUiProps.onMount(state, catchNode as HTMLElement & SVGSVGElement & MathMLElement));
                }
            }

            return errorUi;
        } else {
            throw error;
        }
    }

    return undefined;
}

function unmountTree<S extends PatchableState>(state: S, v: AttachedElementVode<S> | ChildVode<S> | undefined): void {
    if (!v || !Array.isArray(v)) return;
    if (((v as AttachedElementVode<S>)?.[UNMOUNT_COUNT] ?? 0) === 0) return;

    const kidsStart = childrenStart(v);
    if (kidsStart > 0) {
        for (let i = v.length - 1; i >= kidsStart; i--) {
            unmountTree(state, v[i] as AttachedElementVode<S> | ChildVode<S> | undefined);
        }
    }

    const p = props(v);
    if (typeof p?.onUnmount === "function") {
        state.patch(p.onUnmount(state, (v as AttachedElementVode<S>)[NODE]));
    }
}

function sumChildUnmountCounts<S>(v: AttachedElementVode<S>): number {
    const kidsStart = childrenStart(v);
    if (kidsStart < 1) return 0;
    let n = 0;
    for (let i = kidsStart; i < v.length; i++) {
        const k = v[i] as AttachedVode<S>;
        if (Array.isArray(k)) {
            n += ((k as AttachedElementVode<S>)[UNMOUNT_COUNT] ?? 0);
        }
    }
    return n;
}

function isNaturalVode<S>(x: ChildVode<S>): x is Vode<S> {
    return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}

function isTextVode<S>(x: ChildVode<S>): x is TextVode {
    return typeof x === "string" || (<Text><unknown>x)?.nodeType === TEXT_NODE;
}

function remember<S>(state: S, present: MemoNode<S>, past?: MemoNode<S>): ChildVode<S> | AttachedVode<S> {
    while (typeof present === "function" && !present[MEMO]) {
        present = present(state) as MemoNode<S>;
    }

    if (typeof present !== "function")
        return present;

    const presentMemo = present?.[MEMO];
    const pastMemo = past?.[MEMO];

    if (
        Array.isArray(presentMemo) && Array.isArray(pastMemo)
        && presentMemo.length === pastMemo.length
    ) {
        let same = true;
        for (let i = 0; i < presentMemo.length; i++) {
            if (presentMemo[i] !== pastMemo[i]) {
                same = false;
                break;
            }
        }
        if (same) return past;
    }

    // memos are not equal so we unwrap the present
    while (typeof present === "function") {
        present = present(state) as MemoNode<S>;
    }

    // attach memo to the unwrapped present for future comparisons
    if (present && typeof present === "object") {
        present[MEMO] = presentMemo;
    }

    return present;
}

function patchProperties<S extends PatchableState>(
    s: S, node: ElementNode<S>,
    oldProps: Props<S> | null | undefined, newProps: Props<S> | null | undefined,
    xmlns: string | null | undefined
) {
    if (!newProps && !oldProps) return;

    const xmlMode = xmlns !== undefined;

    // match existing properties
    if (oldProps) {
        for (const key in oldProps) {
            const oldValue = oldProps[key as keyof Props<S>] as PropertyValue<S>;
            const newValue = newProps?.[key as keyof Props<S>] as PropertyValue<S>;

            if (oldValue !== newValue) {
                if (newProps)
                    newProps[key as keyof Props<S>] = patchProperty(s, node, key, oldValue, newValue, xmlMode);
                else
                    patchProperty(s, node, key, oldValue, undefined, xmlMode);
            }
        }
    }

    // new properties that weren't in oldProps
    if (newProps && oldProps) {
        for (const key in newProps) {
            if (!(key in oldProps)) {
                const newValue = newProps[key as keyof Props<S>] as PropertyValue<S>;
                newProps[key as keyof Props<S>] = patchProperty(s, node, key, undefined, newValue, xmlMode);
            }
        }
    }
    // only new props
    else if (newProps) {
        for (const key in newProps) {
            const newValue = newProps[key as keyof Props<S>] as PropertyValue<S>;
            newProps[key as keyof Props<S>] = patchProperty(s, node, key, undefined, newValue, xmlMode);
        }
    }
}

function patchProperty<S extends PatchableState>(
    s: S, node: ElementNode<S>,
    key: string | keyof ElementEventMap,
    oldValue: PropertyValue<S>, newValue: PropertyValue<S>,
    xmlMode: boolean
) {
    if (key === "style") {
        if (!newValue) {
            node.style.cssText = "";
        } else if (typeof newValue === "string") {
            if (oldValue !== newValue) node.style.cssText = newValue;
        } else if (oldValue && typeof oldValue === "object") {
            for (let k in oldValue) {
                const nv = newValue[k as keyof PropertyValue<S>];
                if (nv === undefined || nv === null) {
                    node.style[k as keyof PropertyValue<S>] = <string><unknown>null;
                }
            }
            for (let k in (newValue as Record<keyof CSSStyleDeclaration, CSSStyleDeclaration>)) {
                const ov = oldValue[k as keyof PropertyValue<S>];
                const nv = newValue[k as keyof PropertyValue<S>];
                if (ov !== nv) {
                    node.style[k as keyof PropertyValue<S>] = nv;
                }
            }
        } else {
            if (oldValue) node.style.cssText = "";
            for (let k in (newValue as Props<S>)) {
                node.style[k as keyof PropertyValue<S>] = newValue[k as keyof PropertyValue<S>];
            }
        }
    } else if (key === "class") {
        if (newValue) {
            node.setAttribute("class", classString(newValue as ClassProp));
        } else {
            node.removeAttribute("class");
        }
    } else if (key[0] === "o" && key[1] === "n") {
        if (newValue) {
            let eventHandler: Function | null = null;
            if (typeof newValue === "function") {
                const action = newValue as EventFunction<S>;
                eventHandler = (evt: Event) => s.patch(action(s, evt));
            } else if (typeof newValue === "object") {
                eventHandler = () => s.patch(newValue as Patch<S>);
            }

            node[key] = eventHandler;
        } else {
            node[key] = null;
        }
    } else {
        if (!xmlMode) node[key] = newValue;
        if (newValue === undefined || newValue === null || newValue === false)
            node.removeAttribute(key);
        else
            node.setAttribute(key, <string>newValue);
    }

    return newValue;
}

function classString(classProp: ClassProp): string {
    if (typeof classProp === "string")
        return classProp;
    else if (Array.isArray(classProp))
        return classProp.map(classString).join(" ");
    else if (classProp && typeof classProp === "object")
        return Object.keys(classProp).filter(k => classProp[k]).join(" ");
    else
        return "";
}
