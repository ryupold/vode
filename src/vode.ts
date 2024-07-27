export type Vode<S> = FullVode<S> | JustTagVode | NoPropsVode<S>;
export type ChildVode<S> = Vode<S> | TextVode | NoVode | Component<S>;
export type FullVode<S> = [tag: Tag, props: Props<S> | ChildVode<S>, ...children: ChildVode<S>[]];
export type NoPropsVode<S> = [tag: Tag, ...children: ChildVode<S>[]] | string[];
export type JustTagVode = [tag: Tag];
export type TextVode = string;
export type NoVode = undefined | null | false | void;
export type AttachedVode<S> = (FullVode<S> | NoPropsVode<S> | JustTagVode) & { node: ChildNode, id: string } | Text & { node?: never, id?: never };

export type Patchable<S> = S & { patch: Dispatch<Patch<S>> };
export type DeepPartial<S> = { [P in keyof S]?: S[P] extends Array<infer I> ? Array<Patch<I>> : Patch<S[P]> };

export type Dispatch<S> = (action: Patch<S>) => void;


export type Patch<S> =
    | S
    | DeepPartial<S>
    | Effect<S>
    | AwaitablePatch<S>
    | undefined | null | false | void;

export type Effect<S, P = any> =
    | (() => Patch<S>)
    | EffectFunction<S>
    | EffectArray<S>
    | EffectFunctionP<S, P>
    | EffectArrayP<S, P>;

export type EffectFunction<S> = (state: S, ...payload: any[]) => Patch<S>;
export type EffectArray<S> = [transformer: EffectFunction<S>, ...payload: any[]];
export type EffectFunctionP<S, P> = (state: S, payload: P) => Patch<S>;
export type EffectArrayP<S, P> = [transformer: EffectFunction<S>, payload: P];

export type AwaitablePatch<S> = Promise<Patch<S>> | Generator<Patch<S>, unknown, void> | AsyncGenerator<Patch<S>, unknown, void>;

/** HTML, SVG or MathML tag name */
export type Tag = keyof (HTMLElementTagNameMap & SVGElementTagNameMap & MathMLElementTagNameMap);

export type Props<S> = Partial<
    Omit<HTMLElement, keyof (
        DocumentFragment &
        ElementCSSInlineStyle &
        GlobalEventHandlers
    )> &
    ElementCreationOptions &
    EventActions<S>
>
    & {
        [_: string]: unknown,
        class?: ClassProp,
        style?: StyleProp,
        /** called after the element was attached */
        onMount?: MountFunction<S>,
        /** called before the element is detached */
        onUnmount?: MountFunction<S>,
    };

type MountFunction<S> =
    | ((s: S, node: HTMLElement) => Patch<S>)
    | ((s: S, node: SVGSVGElement) => Patch<S>)
    | ((s: S, node: MathMLElement) => Patch<S>)

export type ClassProp =
    | boolean
    | string
    | undefined
    | null
    | Record<string, boolean | undefined | null>
    | string[]

export type StyleProp = Record<number, never> & {
    [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K] | null
}

export type EventActions<S> = {
    [K in keyof EventsMap]: Patch<S> | undefined | null | false
}

type EventsMap =
    & { [K in keyof HTMLElementEventMap as `on${K}`]: HTMLElementEventMap[K] }
    & { [K in keyof WindowEventMap as `on${K}`]: WindowEventMap[K] }
    & { [K in keyof SVGElementEventMap as `on${K}`]: SVGElementEventMap[K] }
    & { onsearch: Event }

type PropertyValue<S> = string | boolean | null | undefined | StyleProp | ClassProp | Patch<S> | void;

export type ContainerNode<S> = HTMLElement & {
    state: S,
    vode: AttachedVode<S>,
    patch: Dispatch<S>,
    render: () => void,
    q: Patch<S>[]
    isRendering: boolean,
    lastRender: DOMHighResTimeStamp,
    stats: { renderTime: number, renderCount: number, queueLengthBeforeRender: number, queueLengthAfterRender: number },
};

type KeyPath<ObjectType extends object> =
    { [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${KeyPath<ObjectType[Key]>}`
        : `${Key}`
    }[keyof ObjectType & (string | number)];

/** create a vode for typed state
 * 
 * overloads:
 * - just a tag: `v("div") // => ["div"]`
 * - tag and props: `v("div", { class: "foo" }) // => ["div", { class: "foo" }]`
 * - tag, props and children: `v("div", { class: "foo" }, ["span", "bar"]) // => ["div", { class: "foo" }, ["span", "bar"]]`
 * - identity: `v(["div", ["span", "bar"]]) // => ["div", ["span", "bar"]]`
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

/** get properties of a vode, if there are any */
export function props<S extends object | unknown>(vode: ChildVode<S> | AttachedVode<S>): Props<S> | undefined {
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

export function patchProps<S extends object | unknown>(vode: Vode<S>, props: Props<S>): void {
    if (!Array.isArray(vode)) return;

    if (vode.length > 1) {
        if (!Array.isArray(vode[1]) && typeof vode[1] === "object") {
            vode[1] = merge(vode[1], props);
            return;
        }

        if (childCount(vode) > 0) {
            (<FullVode<S>>vode).push(null);
        }
        for (let i = vode.length - 1; i > 0; i--) {
            if (i > 1) vode[i] = vode[i - 1];
        }
        vode[1] = props;
    } else {
        (<FullVode<S>>vode).push(props);
    }
}

/** get a slice of all children of a vode, if there are any */
export function children<S extends object | unknown>(vode: ChildVode<S> | AttachedVode<S>): ChildVode<S>[] | undefined {
    const start = childrenStart(vode);
    if (start > 0) {
        return (<Vode<S>>vode).slice(start) as Vode<S>[];
    }

    return undefined;
}

/**  */
export function childrenStart<S extends object | unknown>(vode: ChildVode<S> | AttachedVode<S>): number {
    if (props(vode)) {
        return 2;
    } else {
        return 1;
    }
}

/** html tag of the vode or #text if it is a text node */
export function tag<S extends object | unknown>(v: Vode<S> | TextVode | NoVode | AttachedVode<S>): Tag | "#text" | undefined {
    return !!v ? (Array.isArray(v)
        ? v[0] : (typeof v === "string" || (<any>v).nodeType === Node.TEXT_NODE)
            ? "#text" : undefined) as Tag
        : undefined;
}

export const childCount = <S>(vode: Vode<S>) => vode.length - childrenStart(vode);

export function child<S>(vode: Vode<S>, index: number): ChildVode<S> | undefined {
    return vode[index + childrenStart(vode)] as ChildVode<S>;
}

/** pass an object whose type determines the initial state */
export const createState = <S>(state: S): Patchable<S> => state as Patchable<S>;

/**
 * create a vode app inside a container element
 * @param container will use this container as root and places the result of the dom function and further renderings in it
 * @param initialState @see createState
 * @param dom creates the initial dom from the state and is called on every render
 * @param initialPatches variadic list of patches that are applied after the first render
 */
export function app<S>(container: HTMLElement, initialState: Omit<S, "patch">, dom: Component<S>, ...initialPatches: Patch<S>[]) {
    const root = container as ContainerNode<S>;
    root.stats = { renderTime: 0, renderCount: 0, queueLengthBeforeRender: 0, queueLengthAfterRender: 0 };

    Object.defineProperty(initialState, "patch", {
        enumerable: false, configurable: true,
        writable: false, value: async (action: Patch<S>) => {
            if (!action) return;

            if ((action as AsyncGenerator<Patch<S>, unknown, void>)?.next) {
                const generator = action as AsyncGenerator<Patch<S>, unknown, void>;
                for await (const value of generator) {
                    root.patch!(value);
                }
            } else if ((action as Promise<S>).then) {
                const nextState = await (action as Promise<S>);
                root.patch!(<Patch<S>>nextState);
            } else if (Array.isArray(action)) {
                if (typeof action[0] === "function") {
                    if (action.length > 1)
                        root.patch!(action[0](root.state! as Patchable<S>, ...(action as any[]).slice(1)));
                    else root.patch!(action[0](root.state! as Patchable<S>));
                } else {
                    for (const patch of action) {
                        root.patch!(patch);
                    }
                }
            } else if (typeof action === "function") {
                root.patch!((<EffectFunction<S>>action)(root.state as Patchable<S>));
            } else {
                root.q!.push(<Patch<S>>action);
                if (!root.isRendering) root.render!();
            }
        }
    });

    Object.defineProperty(root, "render", {
        enumerable: false, configurable: true,
        writable: false, value: () => requestAnimationFrame((timestamp) => {
            if (root.isRendering || root.lastRender === timestamp || root.q!.length === 0) return;
            root.isRendering = true;
            const sw = Date.now();
            try {
                root.lastRender = timestamp;
                root.stats.queueLengthBeforeRender = root.q!.length;

                while (root.q!.length > 0) {
                    const patch = root.q!.shift();
                    mergeState(root.state, patch);
                }
                root.vode = render(root.state, root.patch, container, 0, root.vode, dom(root.state))!;
            } finally {
                root.isRendering = false;
                root.stats.renderCount++;
                root.stats.renderTime = Date.now() - sw;
                root.stats.queueLengthAfterRender = root.q!.length;
                if (root.q!.length > 0) {
                    root.render!();
                }
            }
        })
    });

    root.patch = (<Patchable<any>>initialState).patch;
    root.state = <S>initialState;
    root.q = [];
    const initialVode = dom(<S>initialState);
    root.vode = <AttachedVode<S>>initialVode;
    root.vode = render(<S>initialState, root.patch!, container, 0, undefined, initialVode)!;

    for (const effect of initialPatches) {
        root.patch!(effect);
    }

    return root.patch;
}

export type Component<S> = ((s: S) => ChildVode<S>) | ((s: S) => Component<S>);


/** for a type safe way to create a deeply partial patch object or effect */
export function patch<S>(p: DeepPartial<S> | Effect<S> | undefined | null | false | void): typeof p { return p; }

/** merge multiple objects into one, applying from left to right
 * @param first object to merge
 * @returns merged object
 */
export function merge(first?: any, ...p: any[]): any {
    first = mergeState({}, first);
    for (const pp of p) {
        if (!pp) continue;
        first = mergeState(first, pp);
    }
    return first!;
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

export function isNaturalVode(x: ChildVode<any>) {
    return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}

export function isTextVode(x: ChildVode<any>) {
    return typeof x === "string" || (<Text><unknown>x)?.nodeType === Node.TEXT_NODE;
}

function unwrap<S>(c: Component<S> | ChildVode<S>, s: S): ChildVode<S> {
    if (typeof c === "function") {
        return unwrap(c(s), s);
    } else {
        return c;
    }
}

/** memoization of the given component or props (compare array is compared element by element (===) with the previous render) */
export function memo<S extends object | unknown>(compare: any[], componentOrProps: Component<S> | ((s: S) => Props<S>)): typeof componentOrProps extends ((s: S) => Props<S>) ? ((s: S) => Props<S>) : Component<S> {
    (<any>componentOrProps).__memo = compare;
    return componentOrProps as typeof componentOrProps extends ((s: S) => Props<S>) ? ((s: S) => Props<S>) : Component<S>;
}

function remember<S>(state: S, present: any, past: any): ChildVode<S> | AttachedVode<S> {
    if (typeof present !== "function")
        return present;

    const presentMemo = present?.__memo;
    const pastMemo = past?.__memo;

    if (Array.isArray(presentMemo)
        && Array.isArray(pastMemo)
        && presentMemo.length === pastMemo.length
        && presentMemo.every((x, i) => x === pastMemo[i])) {
        return past;
    }
    const newRender = unwrap(present, state);
    if (typeof newRender === "object") (<any>newRender).__memo = present?.__memo;
    return newRender;
}

function render<S>(state: S, patch: Dispatch<S>, parent: ChildNode, childIndex: number, oldVode: AttachedVode<S> | undefined, newVode: ChildVode<S>, svg?: boolean): AttachedVode<S> | undefined {
    newVode = remember(state, newVode, oldVode) as ChildVode<S>;
    if (newVode === oldVode || (!oldVode && !newVode)) {
        return oldVode;
    }

    const isText = isTextVode(newVode);
    const isNode = newVode && isNaturalVode(newVode);
    const alreadyAttached = newVode && typeof newVode !== "string" && ((<any>newVode)?.node || (<any>newVode)?.nodeType === Node.TEXT_NODE);

    if (!isText && !isNode && !alreadyAttached && !oldVode) {
        console.error("Invalid vode:", oldVode, newVode);
        throw new Error("Invalid vode: " + typeof newVode + " " + JSON.stringify(newVode));
    }
    else if (alreadyAttached && isText) {
        newVode = (<Text><any>newVode).wholeText;
    }
    else if (alreadyAttached && isNode) {
        newVode = [...<Vode<S>>newVode];
    }

    const oldIsText = (oldVode as Text)?.nodeType === Node.TEXT_NODE;
    const oldNode: ChildNode | undefined = oldIsText ? oldVode as Text : oldVode?.node;

    // falsy|text|element(A) -> undefined 
    if (!newVode) {
        (<any>oldNode)?.onUnmount && patch((<any>oldNode).onUnmount(oldNode));
        oldNode?.remove();
        return undefined;
    }

    // text -> text
    if (oldIsText && isText) {
        if ((<Text>oldNode).textContent !== <string>newVode)
            (<Text>oldNode).textContent = <string>newVode;
        return oldVode;
    }
    // falsy|element -> text
    if (isText && (!oldNode || !oldIsText)) {
        const text = document.createTextNode(newVode as string)
        if (oldNode) {
            (<any>oldNode).onUnmount && patch((<any>oldNode).onUnmount(oldNode));
            oldNode.replaceWith(text);
        } else {
            parent.appendChild(text);
        }

        return text as Text;
    }

    // falsy|text|element(A) -> element(B) 
    if (isNode && (!oldNode || oldIsText || (<Vode<S>>oldVode)[0] !== (<Vode<S>>newVode)[0])) {
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

/** put a value deep inside an object addressed by a key path (creating necessary structure on the way). if target is null, a new object is created */
export function put<O extends object | unknown>(keyPath: O extends object ? KeyPath<O> : string, value: any = undefined, target: DeepPartial<O> | null = null) {
    if (!target) target = {} as O as any;

    const keys = keyPath.split('.');
    let i = 0;
    let raw = (<any>target)[keys[i]];
    if (raw === undefined) {
        (<any>target)[keys[i]] = raw = {};
    }
    for (i = 1; i < keys.length - 1; i++) {
        const p = raw;
        raw = raw[keys[i]];
        if (raw === undefined) {
            raw = {};
            p[keys[i]] = raw;
        }
    }
    raw[keys[i]] = value;
    return target
}

/** get a value deep inside an object by its key path */
export function get<O extends object | unknown>(keyPath: O extends object ? KeyPath<O> : string, source: DeepPartial<O>) {
    const keys = keyPath.split('.');
    let raw = source ? (<any>source)[keys[0]] : undefined;
    for (let i = 1; i < keys.length && !!raw; i++) {
        raw = raw[keys[i]];
    }
    return raw;
}