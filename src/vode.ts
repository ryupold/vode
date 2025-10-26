export type Vode<S = PatchableState> = FullVode<S> | JustTagVode | NoPropsVode<S>;
export type FullVode<S = PatchableState> = [tag: Tag, props: Props<S>, ...children: ChildVode<S>[]];
export type NoPropsVode<S = PatchableState> = [tag: Tag, ...children: ChildVode<S>[]] | (TextVode[]);
export type JustTagVode = [tag: Tag];
export type ChildVode<S = PatchableState> = Vode<S> | TextVode | NoVode | Component<S>;
export type TextVode = string & {};
export type NoVode = undefined | null | number | boolean | bigint | void;
export type AttachedVode<S> = Vode<S> & { node: ChildNode } | Text & { node?: never };
export type Tag = keyof (HTMLElementTagNameMap & SVGElementTagNameMap & MathMLElementTagNameMap) | (string & {});
export type Component<S> = (s: S) => ChildVode<S>;

export type Patch<S> =
    | IgnoredPatch // ignored
    | RenderPatch<S> // updates state, causes render
    | Promise<Patch<S>> | Effect<S>; // is executed, awaited, results in patches

export type IgnoredPatch = undefined | null | number | boolean | bigint | string | symbol | void;
export type RenderPatch<S> = {} | DeepPartial<S>;
export type AnimatedPatch<S> = Array<Patch<S>>;
export type DeepPartial<S> = { [P in keyof S]?: S[P] extends Array<infer I> ? Array<DeepPartial<I>> : DeepPartial<S[P]> };

export type Effect<S> =
    | (() => Patch<S>)
    | EventFunction<S>
    | Generator<Patch<S>>
    | AsyncGenerator<Patch<S>>;

export type EventFunction<S> = (state: S, evt: Event) => Patch<S>;

export type Props<S> = Partial<
    Omit<HTMLElement,
        keyof (DocumentFragment & ElementCSSInlineStyle & GlobalEventHandlers)> &
    { [K in keyof EventsMap]: EventFunction<S> | Patch<S> } // all on* events
> & {
    [_: string]: unknown,
    class?: ClassProp,
    style?: StyleProp | string,
    /** called after the element was attached */
    onMount?: MountFunction<S>,
    /** called before the element is detached */
    onUnmount?: MountFunction<S>,
};

export type MountFunction<S> =
    | ((s: S, node: HTMLElement) => Patch<S>)
    | ((s: S, node: SVGSVGElement) => Patch<S>)
    | ((s: S, node: MathMLElement) => Patch<S>);

export type ClassProp =
    | "" | false | null | undefined // no class
    | string // "class1 class2"
    | string[] // ["class1", "class2"]
    | Record<string, boolean | undefined | null>; // { class1: true, class2: false }

export type StyleProp = Record<number, never> & {
    [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K] | null
};

export type EventsMap =
    & { [K in keyof HTMLElementEventMap as `on${K}`]: HTMLElementEventMap[K] }
    & { [K in keyof WindowEventMap as `on${K}`]: WindowEventMap[K] }
    & { [K in keyof SVGElementEventMap as `on${K}`]: SVGElementEventMap[K] }
    & { onsearch: Event };

export type PropertyValue<S> =
    | string | boolean | null | undefined | void
    | StyleProp | ClassProp
    | Patch<S>;

export type Dispatch<S> = (action: Patch<S>) => void;
export type PatchableState<S = object> = S & { patch: Dispatch<S> };

export const globals = {
    currentViewTransition: <ViewTransition | null | undefined>undefined,
    requestAnimationFrame: !!window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : ((cb: () => void) => cb()),
    startViewTransition: !!document.startViewTransition ? document.startViewTransition.bind(document) : null,
};

export type ContainerNode<S = PatchableState> = HTMLElement & {
    /** the `_vode` property is added to the container in `app()`.
     * it contains all necessary stuff for the vode app to function.
     * remove the container node to clear vodes resources */
    _vode: {
        state: PatchableState<S>,
        vode: AttachedVode<S>,
        patch: Dispatch<S>,
        renderSync: () => void,
        renderAsync: () => Promise<unknown>,
        syncRenderer: (cb: () => void) => void,
        asyncRenderer: ((cb: () => void) => ViewTransition) | null | undefined,
        qSync: {} | undefined | null,  // next patch aggregate to be applied
        qAsync: {} | undefined | null,  // next render-patches to be animated after another
        isRendering: boolean,
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

/** type-safe way to create a vode. useful for type inference and autocompletion.
 * 
 * - just a tag: `vode("div")` => `["div"]` --*rendered*-> `<div></div>`
 * - tag and props: `vode("div", { class: "foo" })` => `["div", { class: "foo" }]` --*rendered*-> `<div class="foo"></div>`
 * - tag, props and children: `vode("div", { class: "foo" }, ["span", "bar"])` => `["div", { class: "foo" }, ["span", "bar"]]` --*rendered*-> `<div class="foo"><span>bar</span></div>`
 * - identity: `vode(["div", ["span", "bar"]])` => `["div", ["span", "bar"]]` --*rendered*-> `<div><span>bar</span></div>`
 */
export function vode<S = PatchableState>(tag: Tag | Vode<S>, props?: Props<S> | ChildVode<S>, ...children: ChildVode<S>[]): Vode<S> {
    if (!tag) throw new Error("first argument to vode() must be a tag name or a vode");

    if (Array.isArray(tag)) return tag;
    else if (props) return [tag, props as Props<S>, ...children];
    else return [tag, ...children];
}

/** create a vode app inside a container element
 * @param container will use this container as root and places the result of the dom function and further renderings in it
 * @param state the state object that is used as singleton state bound to the vode app and is updated with `patch()`
 * @param dom function is alled every render and returnes the vode-dom that is updated incrementally to the DOM based on the state.
 * @param initialPatches variadic list of patches that are applied after the first render
 * @returns a patch function that can be used to update the state
 */
export function app<S = PatchableState>(container: Element, state: Omit<S, "patch">, dom: (s: S) => Vode<S>, ...initialPatches: Patch<S>[]) {
    if (!container?.parentElement) throw new Error("first argument to app() must be a valid HTMLElement inside the <html></html> document");
    if (!state || typeof state !== "object") throw new Error("second argument to app() must be a state object");
    if (typeof dom !== "function") throw new Error("third argument to app() must be a function that returns a vode");

    const _vode = {} as ContainerNode<S>["_vode"] & { patch: (action: Patch<S>, animate?: boolean) => void };
    _vode.syncRenderer = globals.requestAnimationFrame;
    _vode.asyncRenderer = globals.startViewTransition;
    _vode.qSync = null;
    _vode.qAsync = null;
    _vode.stats = { lastSyncRenderTime: 0, lastAsyncRenderTime: 0, syncRenderCount: 0, asyncRenderCount: 0, liveEffectCount: 0, patchCount: 0, syncRenderPatchCount: 0, asyncRenderPatchCount: 0 };

    Object.defineProperty(state, "patch", {
        enumerable: false, configurable: true,
        writable: false, value: async (action: Patch<S>, isAsync?: boolean) => {
            if (!action || (typeof action !== "function" && typeof action !== "object")) return;
            _vode.stats.patchCount++;

            if ((action as AsyncGenerator<Patch<S>>)?.next) {
                const generator = action as AsyncGenerator<Patch<S>>;
                _vode.stats.liveEffectCount++;
                try {
                    let v = await generator.next();
                    while (v.done === false) {
                        _vode.stats.liveEffectCount++;
                        try {
                            _vode.patch!(v.value, isAsync);
                            v = await generator.next();
                        } finally {
                            _vode.stats.liveEffectCount--;
                        }
                    }
                    _vode.patch!(v.value as Patch<S>, isAsync);
                } finally {
                    _vode.stats.liveEffectCount--;
                }
            } else if ((action as Promise<S>).then) {
                _vode.stats.liveEffectCount++;
                try {
                    const nextState = await (action as Promise<S>);
                    _vode.patch!(<Patch<S>>nextState, isAsync);
                } finally {
                    _vode.stats.liveEffectCount--;
                }
            } else if (Array.isArray(action)) {
                if (action.length > 0) {
                    for (const p of action) {
                        _vode.patch(p, !document.hidden && !!_vode.asyncRenderer);
                    }
                } else { //when [] is patched: 1. skip current animation 2. merge all queued async patches into synced queue
                    _vode.qSync = mergeState(_vode.qSync || {}, _vode.qAsync, false);
                    _vode.qAsync = null;
                    globals.currentViewTransition?.skipTransition();
                    _vode.stats.syncRenderPatchCount++;
                    _vode.renderSync();
                }
            } else if (typeof action === "function") {
                _vode.patch!((<(s: S) => unknown>action)(_vode.state), isAsync);
            } else {
                if (isAsync) {
                    _vode.stats.asyncRenderPatchCount++;
                    _vode.qAsync = mergeState(_vode.qAsync || {}, action, false);
                    await _vode.renderAsync();
                } else {
                    _vode.stats.syncRenderPatchCount++;
                    _vode.qSync = mergeState(_vode.qSync || {}, action, false);
                    _vode.renderSync();
                }
            }
        }
    });

    function renderDom(isAsync: boolean) {
        const sw = Date.now();
        const vom = dom(_vode.state);
        _vode.vode = render(_vode.state, _vode.patch, container.parentElement as Element, 0, _vode.vode, vom)!;

        if ((<ContainerNode<S>>container).tagName.toUpperCase() !== (vom[0] as Tag).toUpperCase()) { //the tag name was changed during render -> update reference to vode-app-root 
            container = _vode.vode.node as Element;
            (<ContainerNode<S>>container)._vode = _vode
        }

        if (!isAsync) {
            _vode.stats.lastSyncRenderTime = Date.now() - sw;
            _vode.stats.syncRenderCount++;
            _vode.isRendering = false;
            if (_vode.qSync) _vode.renderSync();
        }
    }
    const sr = renderDom.bind(null, false);
    const ar = renderDom.bind(null, true);

    Object.defineProperty(_vode, "renderSync", {
        enumerable: false, configurable: true,
        writable: false, value: () => {
            if (_vode.isRendering || !_vode.qSync) return;

            _vode.isRendering = true;

            _vode.state = mergeState(_vode.state, _vode.qSync, true);
            _vode.qSync = null;

            _vode.syncRenderer(sr);
        }
    });

    Object.defineProperty(_vode, "renderAsync", {
        enumerable: false, configurable: true,
        writable: false, value: async () => {
            if (_vode.isAnimating || !_vode.qAsync) return;
            await globals.currentViewTransition?.updateCallbackDone; //sandwich
            if (_vode.isAnimating || !_vode.qAsync || document.hidden) return;

            _vode.isAnimating = true;
            const sw = Date.now();
            try {
                _vode.state = mergeState(_vode.state, _vode.qAsync, true);
                _vode.qAsync = null;

                globals.currentViewTransition = _vode.asyncRenderer!(ar) as ViewTransition | undefined;

                await globals.currentViewTransition?.updateCallbackDone;
            } finally {
                _vode.stats.lastAsyncRenderTime = Date.now() - sw;
                _vode.stats.asyncRenderCount++;
                _vode.isAnimating = false;
            }
            if (_vode.qAsync) _vode.renderAsync();
        }
    });

    _vode.patch = (<PatchableState<S>>state).patch;
    _vode.state = <PatchableState<S>>state;

    const root = container as ContainerNode<S>;
    root._vode = _vode;

    _vode.vode = render(
        <S>state,
        _vode.patch!,
        container.parentElement,
        Array.from(container.parentElement.children).indexOf(container),
        hydrate<S>(container, true) as AttachedVode<S>,
        dom(<S>state)
    )!;

    for (const effect of initialPatches) {
        _vode.patch!(effect);
    }

    return _vode.patch;
}

/** return vode representation of given DOM node */
export function hydrate<S = PatchableState>(element: Element | Text, prepareForRender?: boolean): Vode<S> | string | AttachedVode<S> | undefined {
    if ((element as Text)?.nodeType === Node.TEXT_NODE) {
        if ((element as Text).nodeValue?.trim() !== "")
            return prepareForRender ? element as Text : (element as Text).nodeValue!;
        return undefined; //ignore (mostly html whitespace)
    }
    else if (element.nodeType === Node.COMMENT_NODE) {
        return undefined; //ignore (not interesting)
    }
    else if (element.nodeType === Node.ELEMENT_NODE) {
        const tag: Tag = (<Element>element).tagName.toLowerCase();
        const root: Vode<S> = [tag];

        if (prepareForRender) (<AttachedVode<S>>root).node = element;
        if ((element as HTMLElement)?.hasAttributes()) {
            const props: Props<S> = {};
            const attr = (<HTMLElement>element).attributes;
            for (let a of attr) {
                props[a.name] = a.value;
            }
            (<Vode<S>>root).push(props as any);
        }
        if (element.hasChildNodes()) {
            const remove: ChildNode[] = [];
            for (let child of element.childNodes) {
                const wet = child && hydrate<S>(child as Element | Text, prepareForRender)! as ChildVode<S>;
                if (wet) root.push(wet as any);
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
 * `compare` of the previous render. otherwise skips the render step (not calling `componentOrProps`)*/
export function memo<S = PatchableState>(compare: any[], componentOrProps: Component<S> | ((s: S) => Props<S>)): typeof componentOrProps extends ((s: S) => Props<S>) ? ((s: S) => Props<S>) : Component<S> {
    if (!compare || !Array.isArray(compare)) throw new Error("first argument to memo() must be an array of values to compare");
    if (typeof componentOrProps !== "function") throw new Error("second argument to memo() must be a function that returns a vode or props object");

    (<any>componentOrProps).__memo = compare;
    return componentOrProps as typeof componentOrProps extends ((s: S) => Props<S>) ? ((s: S) => Props<S>) : Component<S>;
}

/** create a state object used as state for `app()`. it is updated with `PatchableState.patch()` using `merge()` */
export function createState<S = PatchableState>(state: S): PatchableState<S> {
    if (!state || typeof state !== "object") throw new Error("createState() must be called with a state object");

    return state as PatchableState<S>;
}

/** type safe way to create a patch. useful for type inference and autocompletion. */
export function createPatch<S = PatchableState>(p: DeepPartial<S> | Effect<S> | IgnoredPatch): typeof p { return p; }

/** html tag of the vode or `#text` if it is a text node */
export function tag<S = PatchableState>(v: Vode<S> | TextVode | NoVode | AttachedVode<S>): Tag | "#text" | undefined {
    return !!v ? (Array.isArray(v)
        ? v[0] : (typeof v === "string" || (<any>v).nodeType === Node.TEXT_NODE)
            ? "#text" : undefined) as Tag
        : undefined;
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
            && (vode[1] as unknown as Node).nodeType !== Node.TEXT_NODE
        ) {
            return vode[1];
        }
    }

    return undefined;
}

/** get a slice of all children of a vode, if there are any */
export function children<S = PatchableState>(vode: ChildVode<S> | AttachedVode<S>): ChildVode<S>[] | null {
    const start = childrenStart(vode);
    if (start > 0) {
        return (<Vode<S>>vode).slice(start) as Vode<S>[];
    }

    return null;
}

export function childCount<S = PatchableState>(vode: Vode<S>) { return vode.length - childrenStart(vode); }

export function child<S = PatchableState>(vode: Vode<S>, index: number): ChildVode<S> | undefined {
    return vode[index + childrenStart(vode)] as ChildVode<S>;
}

/** index in vode at which child-vodes start */
export function childrenStart<S = PatchableState>(vode: ChildVode<S> | AttachedVode<S>): number {
    if (Array.isArray(vode) && vode.length > 0) {
        if (!!vode[1] && !Array.isArray(vode[1]) && typeof vode[1] === "object") 
            return 2;
        else return 1;
    }
    else return 0;
}

function mergeState(target: any, source: any, allowDeletion: boolean) {
    if (!source) return target;

    for (const key in source) {
        const value = source[key];
        if (value && typeof value === "object") {
            const targetValue = target[key];
            if (targetValue) {
                if (Array.isArray(value)) {
                    target[key] = [...value];
                } else if (value instanceof Date && targetValue !== value) {
                    target[key] = new Date(value);
                } else {
                    if (Array.isArray(targetValue)) target[key] = mergeState({}, value, allowDeletion);
                    else if (typeof targetValue === "object") mergeState(target[key], value, allowDeletion);
                    else target[key] = mergeState({}, value, allowDeletion);
                }
            } else if (Array.isArray(value)) {
                target[key] = [...value];
            } else if (value instanceof Date) {
                target[key] = new Date(value);
            } else {
                target[key] = mergeState({}, value, allowDeletion);
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
};

function render<S>(state: S, patch: Dispatch<S>, parent: Element, childIndex: number, oldVode: AttachedVode<S> | undefined, newVode: ChildVode<S>, xmlns?: string): AttachedVode<S> | undefined {
    // unwrap component if it is memoized
    newVode = remember(state, newVode, oldVode) as ChildVode<S>;

    const isNoVode = !newVode || typeof newVode === "number" || typeof newVode === "boolean";
    if (newVode === oldVode || (!oldVode && isNoVode)) {
        return oldVode;
    }

    const oldIsText = (oldVode as Text)?.nodeType === Node.TEXT_NODE;
    const oldNode: ChildNode | undefined = oldIsText ? oldVode as Text : oldVode?.node;

    // falsy|text|element(A) -> undefined 
    if (isNoVode) {
        (<any>oldNode)?.onUnmount && patch((<any>oldNode).onUnmount(oldNode));
        oldNode?.remove();
        return undefined;
    }

    const isText = !isNoVode && isTextVode(newVode);
    const isNode = !isNoVode && isNaturalVode(newVode);
    const alreadyAttached = !!newVode && typeof newVode !== "string" && !!((<any>newVode)?.node || (<any>newVode)?.nodeType === Node.TEXT_NODE);

    if (!isText && !isNode && !alreadyAttached && !oldVode) {
        throw new Error("Invalid vode: " + typeof newVode + " " + JSON.stringify(newVode));
    }
    else if (alreadyAttached && isText) {
        newVode = (<Text><any>newVode).wholeText;
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
        const text = document.createTextNode(newVode as string)
        if (oldNode) {
            (<any>oldNode).onUnmount && patch((<any>oldNode).onUnmount(oldNode));
            oldNode.replaceWith(text);
        } else {
            if (parent.childNodes[childIndex]) {
                parent.insertBefore(text, parent.childNodes[childIndex]);
            } else {
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
            newvode[1] = remember(state, newvode[1], undefined) as Vode<S>;
        }

        const properties = props(newVode);

        xmlns = properties?.xmlns as string || xmlns;
        const newNode: ChildNode = xmlns
            ? document.createElementNS(xmlns, (<Vode<S>>newVode)[0])
            : document.createElement((<Vode<S>>newVode)[0]);
        (<AttachedVode<S>>newVode).node = newNode;

        patchProperties(state, patch, newNode, undefined, properties);

        if (oldNode) {
            (<any>oldNode).onUnmount && patch((<any>oldNode).onUnmount(oldNode));
            oldNode.replaceWith(newNode);
        } else {
            if (parent.childNodes[childIndex]) {
                parent.insertBefore(newNode, parent.childNodes[childIndex]);
            } else {
                parent.appendChild(newNode);
            }
        }

        const newChildren = children(newVode);
        if (newChildren) {
            for (let i = 0; i < newChildren.length; i++) {
                const child = newChildren[i];
                const attached = render(state, patch, newNode as Element, i, undefined, child, xmlns);
                (<Vode<S>>newVode!)[properties ? i + 2 : i + 1] = <Vode<S>>attached;
            }
        }

        (<any>newNode).onMount && patch((<any>newNode).onMount(newNode));
        return <AttachedVode<S>>newVode;
    }

    //element(A) -> element(A) 
    if (!oldIsText && isNode && (<Vode<S>>oldVode)[0] === (<Vode<S>>newVode)[0]) {
        (<AttachedVode<S>>newVode).node = oldNode;

        const newvode = <Vode<S>>newVode;
        const oldvode = <Vode<S>>oldVode;

        let hasProps = false;
        if ((<any>newvode[1])?.__memo) {
            const prev = newvode[1] as any;
            newvode[1] = remember(state, newvode[1], oldvode[1]) as Vode<S>;
            if (prev !== newvode[1]) {
                const properties = props(newVode);
                patchProperties(state, patch, oldNode!, props(oldVode), properties);
                hasProps = !!properties;
            }
        }
        else {
            const properties = props(newVode);
            patchProperties(state, patch, oldNode!, props(oldVode), properties);
            hasProps = !!properties;
        }

        const newKids = children(newVode);
        const oldKids = children(oldVode) as AttachedVode<S>[];
        if (newKids) {
            for (let i = 0; i < newKids.length; i++) {
                const child = newKids[i];
                const oldChild = oldKids && oldKids[i];

                const attached = render(state, patch, oldNode as Element, i, oldChild, child, xmlns);
                if (attached) {
                    (<Vode<S>>newVode)[hasProps ? i + 2 : i + 1] = <Vode<S>>attached;
                }
            }
            for (let i = newKids.length; oldKids && i < oldKids.length; i++) {
                if (oldKids[i]?.node)
                    oldKids[i].node!.remove();
                else if ((oldKids[i] as Text)?.nodeType === Node.TEXT_NODE)
                    (oldKids[i] as Text).remove();
            }
        }

        for (let i = newKids?.length || 0; i < oldKids?.length || 0; i++) {
            if (oldKids[i]?.node)
                oldKids[i].node!.remove();
            else if ((oldKids[i] as Text)?.nodeType === Node.TEXT_NODE)
                (oldKids[i] as Text).remove();
        }
        return <AttachedVode<S>>newVode;
    }

    return undefined;
}

function isNaturalVode(x: ChildVode<any>) {
    return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}

function isTextVode(x: ChildVode<any>) {
    return typeof x === "string" || (<Text><unknown>x)?.nodeType === Node.TEXT_NODE;
}

function remember<S>(state: S, present: any, past: any): ChildVode<S> | AttachedVode<S> {
    if (typeof present !== "function")
        return present;

    const presentMemo = present?.__memo;
    const pastMemo = past?.__memo;

    if (Array.isArray(presentMemo)
        && Array.isArray(pastMemo)
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
    const newRender = unwrap(present, state);
    if (typeof newRender === "object") {
        (<any>newRender).__memo = present?.__memo;
    }
    return newRender;
}

function unwrap<S>(c: Component<S> | ChildVode<S>, s: S): ChildVode<S> {
    if (typeof c === "function") {
        return unwrap(c(s), s);
    } else {
        return c;
    }
}

function patchProperties<S>(s: S, patch: Dispatch<S>, node: ChildNode, oldProps?: Props<S>, newProps?: Props<S>) {
    if (!newProps && !oldProps) return;

    // match existing properties
    if (oldProps) {
        for (const key in oldProps) {
            const oldValue = oldProps[key as keyof Props<S>] as PropertyValue<S>;
            const newValue = newProps?.[key as keyof Props<S>] as PropertyValue<S>;

            if (oldValue !== newValue) {
                if (newProps) newProps[key as keyof Props<S>] = patchProperty(s, patch, node, key, oldValue, newValue);
                else patchProperty(s, patch, node, key, oldValue, undefined);
            }
        }
    }

    //new properties that weren't in oldProps
    if (newProps && oldProps) {
        for (const key in newProps) {
            if (!(key in oldProps)) {
                const newValue = newProps[key as keyof Props<S>] as PropertyValue<S>;
                newProps[key as keyof Props<S>] = patchProperty(s, patch, <Element>node, key, undefined, newValue);
            }
        }
    }
    // only new props
    else if (newProps) {
        for (const key in newProps) {
            const newValue = newProps[key as keyof Props<S>] as PropertyValue<S>;
            newProps[key as keyof Props<S>] = patchProperty(s, patch, <Element>node, key, undefined, newValue);
        }
    }
}

function patchProperty<S>(s: S, patch: Dispatch<S>, node: ChildNode, key: string | keyof ElementEventMap, oldValue?: PropertyValue<S>, newValue?: PropertyValue<S>) {
    if (key === "style") {
        if (!newValue) {
            (node as HTMLElement).style.cssText = "";
        } else if (typeof newValue === "string") {
            if (oldValue !== newValue) (node as HTMLElement).style.cssText = newValue;
        } else if (oldValue && typeof oldValue === "object") {
            for (let k in { ...(oldValue as Props<S>), ...(newValue as Props<S>) }) {
                if (!oldValue || newValue[k as keyof PropertyValue<S>] !== oldValue[k as keyof PropertyValue<S>]) {
                    (node as HTMLElement).style[k as keyof PropertyValue<S>] = newValue[k as keyof PropertyValue<S>];
                }
                else if (oldValue[k as keyof PropertyValue<S>] && !newValue[k as keyof PropertyValue<S>]) {
                    (<any>(node as HTMLElement).style)[k as keyof PropertyValue<S>] = undefined;
                }
            }
        } else {
            for (let k in (newValue as Props<S>)) {
                (node as HTMLElement).style[k as keyof PropertyValue<S>] = newValue[k as keyof PropertyValue<S>];
            }
        }
    } else if (key === "class") {
        if (newValue) {
            (<HTMLElement>node).setAttribute("class", classString(newValue as ClassProp));
        } else {
            (<HTMLElement>node).removeAttribute("class");
        }
    } else if (key[0] === "o" && key[1] === "n") {
        if (newValue) {
            let eventHandler: Function | null = null;
            if (typeof newValue === "function") {
                const action = newValue as EventFunction<S>;
                eventHandler = (evt: Event) => patch(action(s, evt));
            } else if (typeof newValue === "object") {
                eventHandler = () => patch(newValue as Patch<S>);
            }

            (<any>node)[key] = eventHandler;
        } else {
            (<any>node)[key] = null;
        }
    } else if (newValue !== null && newValue !== undefined && newValue !== false) {
        (<HTMLElement>node).setAttribute(key, <string>newValue);
    } else {
        (<HTMLElement>node).removeAttribute(key);
    }

    return newValue;
}

function classString(classProp: ClassProp): string {
    if (typeof classProp === "string")
        return classProp;
    else if (Array.isArray(classProp))
        return classProp.map(classString).join(" ");
    else if (typeof classProp === "object")
        return Object.keys(classProp!).filter(k => classProp![k]).join(" ");
    else
        return '';
}