export type Vode<S> = FullVode<S> | JustTagVode | NoPropsVode<S>;
export type ChildVode<S> = Vode<S> | TextVode | NoVode | Component<S>;
export type FullVode<S> = [tag: Tag, props: Props<S>, ...children: ChildVode<S>[]];
export type NoPropsVode<S> = [tag: Tag, ...children: ChildVode<S>[]] | string[];
export type JustTagVode = [tag: Tag];
export type TextVode = string;
export type NoVode = undefined | null | number | boolean | bigint | void;
export type AttachedVode<S> = Vode<S> & { node: ChildNode, id?: string } | Text & { node?: never, id?: never };
export type Tag = keyof (HTMLElementTagNameMap & SVGElementTagNameMap & MathMLElementTagNameMap);
export type Component<S> = (s: S) => ChildVode<S>;

export type Patch<S> =
    | NoRenderPatch // ignored
    | typeof EmptyPatch | DeepPartial<S> // render patches
    | Promise<Patch<S>> | Effect<S>; // effects resulting in patches

export const EmptyPatch = {} as const; // smallest patch to cause a render without any changes
export type NoRenderPatch = undefined | null | number | boolean | bigint | string | symbol | void;

export type DeepPartial<S> = { [P in keyof S]?: S[P] extends Array<infer I> ? Array<Patch<I>> : Patch<S[P]> };

export type Effect<S> =
    | (() => Patch<S>)
    | EffectFunction<S>
    | [effect: EffectFunction<S>, ...args: any[]]
    | Generator<Patch<S>, unknown, void>
    | AsyncGenerator<Patch<S>, unknown, void>;

export type EffectFunction<S> = (state: S, ...args: any[]) => Patch<S>;

export type Props<S> = Partial<
    Omit<HTMLElement,
        keyof (DocumentFragment & ElementCSSInlineStyle & GlobalEventHandlers)> &
    { [K in keyof EventsMap]: Patch<S> } // all on* events
> & {
    [_: string]: unknown,
    class?: ClassProp,
    style?: StyleProp,
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

export type PropertyValue<S> = string | boolean | null | undefined | StyleProp | ClassProp | Patch<S> | void;


export type Dispatch<S> = (action: Patch<S>) => void;
export type PatchableState<S> = S & { patch: Dispatch<Patch<S>> };

export type ContainerNode<S> = HTMLElement & {
    /** the `_vode` property is added to the container in `app()`.
     * it contains all necessary stuff for the vode app to function.
     * delete it to clear all resources of the vode app, or remove the container itself */
    _vode: {
        state: PatchableState<S>, // can touch this, but let it be an object
        vode: AttachedVode<S>, //don't touch this
        patch: Dispatch<S>, // can't touch this
        render: () => void, // can't touch this
        q: Patch<S>[],  // this will change in the future, so don't touch it
        isRendering: boolean,  // under no circumstances touch this
        /** stats about the overall patches & last render time */
        stats: {
            patchCount: number,
            liveEffectCount: number,
            renderPatchCount: number,
            renderCount: number,
            renderTime: number,
            queueLengthBeforeRender: number,
            queueLengthAfterRender: number,
        },
    }
};

/** create a state object used as initial state for `app()`. it is updated with `PatchableState.patch()` using `merge()` */
export function createState<S extends object | unknown>(state: S): PatchableState<S> { return state as PatchableState<S>; }

/** type safe way to create a patch. useful for type inference and autocompletion. */
export function createPatch<S extends object | unknown>(p: DeepPartial<S> | Effect<S> | NoRenderPatch): Patch<S> { return p; }

/** type-safe way to create a vode. useful for type inference and autocompletion.
 * 
 * - just a tag: `vode("div")` => `["div"]` --*rendered*-> `<div></div>`
 * - tag and props: `vode("div", { class: "foo" })` => `["div", { class: "foo" }]` --*rendered*-> `<div class="foo"></div>`
 * - tag, props and children: `vode("div", { class: "foo" }, ["span", "bar"])` => `["div", { class: "foo" }, ["span", "bar"]]` --*rendered*-> `<div class="foo"><span>bar</span></div>`
 * - identity: `vode(["div", ["span", "bar"]])` => `["div", ["span", "bar"]]` --*rendered*-> `<div><span>bar</span></div>`
 */
export function vode<S extends object | unknown>(tag: Tag | Vode<S>, props?: Props<S> | ChildVode<S>, ...children: ChildVode<S>[]): Vode<S> {
    if (Array.isArray(tag)) {
        return tag;
    }
    if (props) {
        return [tag, props as Props<S>, ...children];
    }
    return [tag, ...children];
}

/** create a vode app inside a container element
 * @param container will use this container as root and places the result of the dom function and further renderings in it
 * @param initialState
 * @param dom creates the initial dom from the state and is called on every render
 * @param initialPatches variadic list of patches that are applied after the first render
 * @returns a patch function that can be used to update the state
 */
export function app<S extends object | unknown>(container: HTMLElement, initialState: Omit<S, "patch">, dom: Component<S>, ...initialPatches: Patch<S>[]) {
    const _vode = {} as ContainerNode<S>["_vode"];
    _vode.stats = { renderTime: 0, renderCount: 0, queueLengthBeforeRender: 0, queueLengthAfterRender: 0, liveEffectCount: 0, patchCount: 0, renderPatchCount: 0 };

    Object.defineProperty(initialState, "patch", {
        enumerable: false, configurable: true,
        writable: false, value: async (action: Patch<S>) => {
            if (!action || (typeof action !== "function" && typeof action !== "object")) return;
            _vode.stats.patchCount++;

            if ((action as AsyncGenerator<Patch<S>, unknown, void>)?.next) {
                const generator = action as AsyncGenerator<Patch<S>, unknown, void>;
                _vode.stats.liveEffectCount++;
                try {
                    let v = await generator.next();
                    while (v.done === false) {
                        _vode.stats.liveEffectCount++;
                        try {
                            _vode.patch!(v.value);
                            v = await generator.next();
                        } finally {
                            _vode.stats.liveEffectCount--;
                        }
                    }
                    _vode.patch!(v.value as Patch<S>);
                } finally {
                    _vode.stats.liveEffectCount--;
                }
            } else if ((action as Promise<S>).then) {
                _vode.stats.liveEffectCount++;
                try {
                    const nextState = await (action as Promise<S>);
                    _vode.patch!(<Patch<S>>nextState);
                } finally {
                    _vode.stats.liveEffectCount--;
                }
            } else if (Array.isArray(action)) {
                if (typeof action[0] === "function") {
                    if (action.length > 1)
                        _vode.patch!(action[0](_vode.state!, ...(action as any[]).slice(1)));
                    else _vode.patch!(action[0](_vode.state!));
                } else {
                    _vode.stats.patchCount--;
                }
            } else if (typeof action === "function") {
                _vode.patch!((<EffectFunction<S>>action)(_vode.state));
            } else {
                _vode.stats.renderPatchCount++;
                _vode.q!.push(<Patch<S>>action);
                if (!_vode.isRendering) _vode.render!();
            }
        }
    });

    Object.defineProperty(_vode, "render", {
        enumerable: false, configurable: true,
        writable: false, value: () => requestAnimationFrame(() => {
            if (_vode.isRendering || _vode.q!.length === 0) return;
            _vode.isRendering = true;
            const sw = Date.now();
            try {
                _vode.stats.queueLengthBeforeRender = _vode.q!.length;

                while (_vode.q!.length > 0) {
                    const patch = _vode.q!.shift();
                    if (patch === EmptyPatch) continue;
                    mergeState(_vode.state, patch);
                }
                _vode.vode = render(_vode.state, _vode.patch, container, 0, _vode.vode, dom(_vode.state))!;
            } finally {
                _vode.isRendering = false;
                _vode.stats.renderCount++;
                _vode.stats.renderTime = Date.now() - sw;
                _vode.stats.queueLengthAfterRender = _vode.q!.length;
                if (_vode.q!.length > 0) {
                    _vode.render!();
                }
            }
        })
    });

    _vode.patch = (<PatchableState<S>>initialState).patch;
    _vode.state = <PatchableState<S>>initialState;
    _vode.q = [];

    const root = container as ContainerNode<S>;
    root._vode = _vode;

    const initialVode = dom(<S>initialState);
    _vode.vode = <AttachedVode<S>>initialVode;
    _vode.vode = render(<S>initialState, _vode.patch!, container, 0, undefined, initialVode)!;

    for (const effect of initialPatches) {
        _vode.patch!(effect);
    }

    return _vode.patch;
}

/** memoizes the resulting component or props by comparing element by element (===) with the
 * `compare` of the previous render. otherwise skips the render step (not calling `componentOrProps`)*/
export function memo<S>(compare: any[], componentOrProps: Component<S> | ((s: S) => Props<S>)): typeof componentOrProps extends ((s: S) => Props<S>) ? ((s: S) => Props<S>) : Component<S> {
    (<any>componentOrProps).__memo = compare;
    return componentOrProps as typeof componentOrProps extends ((s: S) => Props<S>) ? ((s: S) => Props<S>) : Component<S>;
}

/** html tag of the vode or `#text` if it is a text node */
export function tag<S>(v: Vode<S> | TextVode | NoVode | AttachedVode<S>): Tag | "#text" | undefined {
    return !!v ? (Array.isArray(v)
        ? v[0] : (typeof v === "string" || (<any>v).nodeType === Node.TEXT_NODE)
            ? "#text" : undefined) as Tag
        : undefined;
}

/** get properties object of a vode, if there is any */
export function props<S>(vode: ChildVode<S> | AttachedVode<S>): Props<S> | undefined {
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

/** merge `ClassProp`s regardless of structure */
export function mergeClass(a: ClassProp, b: ClassProp): ClassProp {
    if (!a) return b;
    if (!b) return a;

    if (typeof a === "string" && typeof b === "string") {
        const aSplit = a.split(" ");
        const bSplit = b.split(" ");
        const classSet = new Set([...aSplit, ...bSplit]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (typeof a === "string" && Array.isArray(b)) {
        const classSet = new Set([...b, ...a.split(" ")]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (Array.isArray(a) && typeof b === "string") {
        const classSet = new Set([...a, ...b.split(" ")]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (Array.isArray(a) && Array.isArray(b)) {
        const classSet = new Set([...a, ...b]);
        return Array.from(classSet).join(" ").trim();
    }
    else if (typeof a === "string" && typeof b === "object") {
        return { [a]: true, ...b };
    }
    else if (typeof a === "object" && typeof b === "string") {
        return { ...a, [b]: true };
    }
    else if (typeof a === "object" && typeof b === "object") {
        return { ...a, ...b };
    } else if (typeof a === "object" && Array.isArray(b)) {
        const aa = { ...a };
        for (const item of b as string[]) {
            (<Record<string, boolean | null | undefined>>aa)[item] = true;
        }
        return aa;
    } else if (Array.isArray(a) && typeof b === "object") {
        const aa: Record<string, any> = {};
        for (const item of a as string[]) {
            aa[item] = true;
        }
        for (const bKey of (<Record<string, any>>b).keys) {
            aa[bKey] = (<Record<string, boolean | null | undefined>>b)[bKey];
        }
        return b;
    }

    throw new Error(`cannot merge classes of ${a} (${typeof a}) and ${b} (${typeof b})`);
}

/** get a slice of all children of a vode, if there are any */
export function children<S>(vode: ChildVode<S> | AttachedVode<S>): ChildVode<S>[] | null {
    const start = childrenStart(vode);
    if (start > 0) {
        return (<Vode<S>>vode).slice(start) as Vode<S>[];
    }

    return null;
}

export function childCount<S>(vode: Vode<S>) { return vode.length - childrenStart(vode); }

export function child<S>(vode: Vode<S>, index: number): ChildVode<S> | undefined {
    return vode[index + childrenStart(vode)] as ChildVode<S>;
}

/** index in vode at which child-vodes start */
export function childrenStart<S>(vode: ChildVode<S> | AttachedVode<S>): number {
    return props(vode) ? 2 : 1;
}

/** @returns multiple merged objects as one, applying from left to right ({}, first, ...p) */
export function merge(first?: object | unknown, ...p: (object | unknown)[]): object {
    first = mergeState({}, first);
    for (const pp of p) {
        if (!pp) continue;
        first = mergeState(first, pp);
    }
    return first!;
}

function mergeState(target: any, source: any) {
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
                    if (Array.isArray(targetValue)) target[key] = mergeState({}, value);
                    else if (typeof targetValue === "object") mergeState(target[key], value);
                    else target[key] = mergeState({}, value);
                }
            } else if (Array.isArray(value)) {
                target[key] = [...value];
            } else if (value instanceof Date) {
                target[key] = new Date(value);
            } else {
                target[key] = mergeState({}, value);
            }
        }
        else if (value === undefined) {
            delete target[key];
        }
        else {
            target[key] = value;
        }
    }
    return target;
};

function render<S>(state: S, patch: Dispatch<S>, parent: ChildNode, childIndex: number, oldVode: AttachedVode<S> | undefined, newVode: ChildVode<S>, svg?: boolean): AttachedVode<S> | undefined {
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
        svg = svg || (<Vode<S>>newVode)[0] === "svg";
        const newNode: ChildNode = svg
            ? document.createElementNS("http://www.w3.org/2000/svg", (<Vode<S>>newVode)[0])
            : document.createElement((<Vode<S>>newVode)[0]);
        (<AttachedVode<S>>newVode).node = newNode;

        const newvode = <Vode<S>>newVode;
        if (1 in newvode) {
            newvode[1] = remember(state, newvode[1], undefined) as Vode<S>;
        }

        const properties = props(newVode);
        patchProperties(patch, newNode, undefined, properties, svg);

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
                const attached = render(state, patch, newNode, i, undefined, child, svg);
                (<Vode<S>>newVode!)[properties ? i + 2 : i + 1] = <Vode<S>>attached;
            }
        }

        (<any>newNode).onMount && patch((<any>newNode).onMount(newNode));
        return <AttachedVode<S>>newVode;
    }

    //element(A) -> element(A) 
    if (!oldIsText && isNode && (<Vode<S>>oldVode)[0] === (<Vode<S>>newVode)[0]) {
        svg = svg || (<Vode<S>>newVode)[0] === "svg";
        (<AttachedVode<S>>newVode).node = oldNode;

        const newvode = <Vode<S>>newVode;
        const oldvode = <Vode<S>>oldVode;

        let hasProps = false;
        if ((<any>newvode[1])?.__memo) {
            const prev = newvode[1] as any;
            newvode[1] = remember(state, newvode[1], oldvode[1]) as Vode<S>;
            if (prev !== newvode[1]) {
                const properties = props(newVode);
                patchProperties(patch, oldNode!, props(oldVode), properties, svg);
                hasProps = !!properties;
            }
        }
        else {
            const properties = props(newVode);
            patchProperties(patch, oldNode!, props(oldVode), properties, svg);
            hasProps = !!properties;
        }

        const newKids = children(newVode);
        const oldKids = children(oldVode) as AttachedVode<S>[];
        if (newKids) {
            for (let i = 0; i < newKids.length; i++) {
                const child = newKids[i];
                const oldChild = oldKids && oldKids[i];

                const attached = render(state, patch, oldNode!, i, oldChild, child, svg);
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

function patchProperties<S>(patch: Dispatch<S>, node: ChildNode, oldProps?: Props<S>, newProps?: Props<S>, isSvg?: boolean) {
    if (!newProps && !oldProps) return;
    if (!oldProps) {         // set new props
        for (const key in newProps) {
            const newValue = newProps[key as keyof Props<S>] as PropertyValue<S>;
            newProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, undefined, newValue, isSvg);
        }
    } else if (newProps) {   // clear old props and set new in one loop
        const combinedKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
        for (const key of combinedKeys) {
            const oldValue = oldProps[key as keyof Props<S>] as PropertyValue<S>;
            const newValue = newProps[key as keyof Props<S>] as PropertyValue<S>;
            if (key[0] === "o" && key[1] === "n") {
                const oldEvent = (<any>node)["__" + key];
                if ((oldEvent && oldEvent !== newValue) || (!oldEvent && oldValue !== newValue)) {
                    newProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, oldValue, newValue, isSvg);
                }
                (<any>node)["__" + key] = newValue;
            }
            else if (oldValue !== newValue) {
                newProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, oldValue, newValue, isSvg);
            }
        }
    } else {                 //delete all old props, cause there are no new props
        for (const key in oldProps) {
            const oldValue = oldProps[key as keyof Props<S>] as PropertyValue<S>;
            oldProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, oldValue, undefined, isSvg);
        }
    }
}

function patchProperty<S>(patch: Dispatch<S>, node: ChildNode, key: string | keyof ElementEventMap, oldValue?: PropertyValue<S>, newValue?: PropertyValue<S>, isSvg?: boolean) {
    if (key === "style") {
        if (!newValue) {
            (node as HTMLElement).style.cssText = "";
        } else if (oldValue) {
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
        if (isSvg) {
            if (newValue) {
                const newClass = classString(newValue as ClassProp);
                (<SVGSVGElement>node).classList.value = newClass;
            } else {
                (<SVGSVGElement>node).classList.value = '';
            }
        } else {
            if (newValue) {
                const newClass = classString(newValue as ClassProp);
                (<HTMLElement>node).className = newClass;
            } else {
                (<HTMLElement>node).className = '';
            }
        }
    } else if (key[0] === "o" && key[1] === "n") {
        if (newValue) {
            let eventHandler: Function | null = null;
            if (typeof newValue === "function") {
                const action = newValue as EffectFunction<S>;
                eventHandler = (evt: Event) => patch([action, evt]);
            } else if (Array.isArray(newValue)) {
                const arr = (newValue as Array<any>);
                const action = newValue[0] as EffectFunction<S>;
                if (arr.length > 1) {
                    eventHandler = () => patch([action, ...arr.slice(1)]);
                }
                else {
                    eventHandler = (evt: Event) => patch([action, evt]);
                }
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
    if (typeof classProp === "string") {
        return classProp;
    } else if (Array.isArray(classProp)) {
        return classProp.map(classString).join(" ");
    } else if (typeof classProp === "object") {
        return Object.keys(classProp!).filter(k => classProp![k]).join(" ");
    } else {
        return "";
    }
}