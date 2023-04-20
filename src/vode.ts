export type Vode<S> = FullVode<S | any> | JustTagVode | SelfClosingVode<S> | NoPropsVode<S | any>;
export type ChildVode<S> = Vode<S> | TextVode | NoVode;
export type FullVode<S> = [tag: Tag, props: Props<S>, ...children: ChildVode<S>[]];
export type SelfClosingVode<S> = [tag: Tag, props: Props<S> | ChildVode<S>];
export type NoPropsVode<S> = [tag: Tag, ...children: ChildVode<S>[]];
export type JustTagVode = [tag: Tag];
export type TextVode = string;
export type NoVode = undefined | null | false;
export type AttachedVode<S> = (FullVode<S> | SelfClosingVode<S> | NoPropsVode<S> | JustTagVode) & { node: ChildNode, id: string } | Text & { node?: never, id?: never };

export type Patchable<S> = S & { patch: Dispatch<S> };

export type Dispatch<S> = (action: Patch<S>) => void;
export type Patch<S> = Partial<S> | Effect<S> | AwaitablePatch<S> | undefined | null | false | void;

export type AwaitablePatch<S> = Promise<Patch<S>> | Generator<Patch<S>, unknown, void> | AsyncGenerator<Patch<S>, unknown, void>;

export type Effect<S, P = any> =
    | EffectFunction<S, P>
    | EffectArray<S, P>;

export type EffectFunction<S, P = any> = (state: S, ...payload: P[]) => Patch<S>;
export type EffectArray<S, P = any> = [transformer: EffectFunction<S, P>, ...payload: P[]];

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
        style?: StyleProp
    };

export type ClassProp =
    | boolean
    | string
    | undefined
    | null
    | Record<string, boolean | undefined | null>
    | ClassProp[]

export type StyleProp = Record<number, never> & {
    [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K] | null
}

export type EventActions<S> = {
    [K in keyof EventsMap]: Effect<S, EventsMap[K]>
}

type EventsMap =
    & { [K in keyof HTMLElementEventMap as `on${K}`]: HTMLElementEventMap[K] }
    & { [K in keyof WindowEventMap as `on${K}`]: WindowEventMap[K] }
    & { onsearch: Event }


type PropertyValue = string | boolean | null | undefined | StyleProp | ClassProp | EventListenerOrEventListenerObject;

type RootNode<S> = HTMLElement & Partial<{
    state: S,
    vode: AttachedVode<S>,
    patch: Dispatch<S>,
    render: () => void,
    q: Partial<S>[]
    isRendering: boolean,
    lastRender: DOMHighResTimeStamp,
}>;

function _props<S>(vode: ChildVode<S> | AttachedVode<S>): Props<S> | undefined {
    if (Array.isArray(vode)
        && vode.length > 1
        && vode[1]
        && typeof vode[1] !== "string"
        && !Array.isArray(vode[1])
        && (vode[1] as unknown as Node).nodeType !== Node.TEXT_NODE) {
        return vode[1];
    }

    return undefined;
}
/**
 * merge multiple props into one, applying from left to right
 * @param p props to merge
 * @returns merged props
 */
export function props<S>(first: Props<S>, ...p: Props<S>[]): Props<S> {
    first = mergeState({}, first);
    for (const pp of p) {
        if (!pp) continue;
        first = mergeState(first, pp);
    }

    return first;
}

function children<S>(vode: ChildVode<S> | AttachedVode<S>): ChildVode<S>[] | undefined {
    if (Array.isArray(vode) && vode.length > 1) {
        if ((typeof vode[1] === "string" || Array.isArray(vode[1]) || (vode[1] as unknown as Text)?.nodeType === Node.TEXT_NODE)) {
            return vode.slice(1) as Vode<S>[];
        } else if (vode.length > 2) {
            return vode.slice(2) as Vode<S>[];
        }
    }


    return undefined;
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

function isNaturalVode(x: ChildVode<any>) {
    return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}

function isTextVode(x: ChildVode<any>) {
    return typeof x === "string" || (<Text><unknown>x)?.nodeType === Node.TEXT_NODE;
}

function render<S>(patch: Dispatch<S>, oldVode: AttachedVode<S> | undefined, newVode: ChildVode<S>, id: string): AttachedVode<S> | undefined {
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

    if (!newVode) {
        oldNode?.remove();
        return undefined;
    }

    // text -> text
    if (oldIsText && isText) {
        if ((<Text>oldNode).textContent !== <string>newVode)
            (<Text>oldNode).textContent = <string>newVode;
        return oldVode;
    }
    // null|element -> text
    if (isText && (!oldNode || !oldIsText)) {
        const text = document.createTextNode(newVode as string)
        oldNode?.replaceWith(text);

        return text as Text;
    }

    // null|text|element(A) -> element(B) 
    if (isNode && (!oldNode || oldIsText || (<Vode<S>>oldVode)[0] !== newVode[0])) {
        const newNode: ChildNode = document.createElement(newVode[0]);
        (<AttachedVode<S>>newVode).id = id;
        (<AttachedVode<S>>newVode).node = newNode;

        const properties = _props(newVode);
        patchProperties(patch, newNode, id, undefined, properties);

        const newChildren = children(newVode);
        if (newChildren) {
            for (let i = 0; i < newChildren.length; i++) {
                const child = newChildren[i];
                const attached = render(patch, undefined, child, id + "-" + i);

                if (attached) {
                    if (isTextVode(child))
                        (<AttachedVode<S>>newVode).node!.appendChild(attached as Text);
                    else
                        (<AttachedVode<S>>newVode).node!.appendChild(attached.node!);
                }
                (<Vode<S>>newVode!)[properties ? i + 2 : i + 1] = <Vode<S>>attached;
            }
        }

        oldNode?.replaceWith(newNode);

        return <AttachedVode<S>>newVode;
    }

    //element(A) -> element(A) 
    if (!oldIsText && isNode && (<Vode<S>>oldVode)[0] === newVode[0]) {
        (<AttachedVode<S>>newVode).id = id;
        (<AttachedVode<S>>newVode).node = oldNode;
        const properties = _props(newVode);
        patchProperties(patch, oldNode!, id, oldVode && _props(oldVode), properties);

        const newKids = children(newVode);
        const oldKids = children(oldVode) as AttachedVode<S>[];
        if (newKids) {
            let before: ChildNode | undefined = undefined;
            for (let i = 0; i < newKids.length; i++) {
                const child = newKids[i];
                const oldChild = oldKids && oldKids[i];

                const attached = render(patch, oldChild, child, id + "-" + i);
                if (attached) {
                    if (!oldChild) {
                        const node = isTextVode(child) ? <Text>attached : attached.node;
                        if (before) {
                            before.after(node!);
                        } else if (i === 0 && (<AttachedVode<S>>newVode).node?.firstChild) {
                            (<AttachedVode<S>>newVode).node!.firstChild!.before(node!);
                        } else {
                            (<AttachedVode<S>>newVode).node!.appendChild(node!);
                        }
                    }
                    before = attached.node;
                    (<Vode<S>>newVode)[properties ? i + 2 : i + 1] = <Vode<S>>attached;
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

function patchProperties<S>(patch: Dispatch<S>, node: ChildNode, id: string, oldProps?: Props<S>, newProps?: Props<S>) {
    if (!newProps && !oldProps) return;
    if (!oldProps) {
        for (let key in newProps) {
            const newValue = newProps[key as keyof Props<S>] as PropertyValue;
            newProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, undefined, newValue)
        }
    }
    else if (newProps) {
        for (const key in { ...oldProps, ...newProps }) {
            const oldValue = oldProps[key as keyof Props<S>] as PropertyValue;
            const newValue = newProps[key as keyof Props<S>] as PropertyValue;
            if (key[0] === "o" && key[1] === "n") {
                const oldEvent = node["__" + key];
                if ((oldEvent && oldEvent !== newValue) || (!oldEvent && oldValue !== newValue)) {
                    newProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, oldValue, newValue);
                }
                node["__" + key] = newValue;
            }
            else if (oldValue !== newValue) {
                newProps[key as keyof Props<S>] = patchProperty(patch, <Element>node, key, oldValue, newValue);
            }
        }
    }

}

function patchProperty<S>(patch: Dispatch<S>, node: ChildNode, key: string | keyof ElementEventMap, oldValue?: PropertyValue, newValue?: PropertyValue) {
    if (key === "style") {
        if (!newValue) {
            (node as HTMLElement).style.cssText = "";
        } else if (oldValue) {
            for (let k in { ...(oldValue as Props<S>), ...(newValue as Props<S>) }) {
                if (!oldValue || newValue[k as keyof PropertyValue] !== oldValue[k as keyof PropertyValue]) {
                    (node as HTMLElement).style[k as keyof PropertyValue] = newValue[k as keyof PropertyValue];
                }
                else if (oldValue[k as keyof PropertyValue] && !newValue[k as keyof PropertyValue]) {
                    (<any>(node as HTMLElement).style)[k as keyof PropertyValue] = undefined;
                }
            }
        } else {
            for (let k in (newValue as Props<S>)) {
                (node as HTMLElement).style[k as keyof PropertyValue] = newValue[k as keyof PropertyValue];
            }
        }
    } else if (key === "class") {
        const newClass = classString(newValue as ClassProp);
        if ((<HTMLElement>node).className !== newClass) {
            (<HTMLElement>node).className = newClass;
        }
    } else if (key[0] === "o" && key[1] === "n") {
        if (newValue) {
            if (typeof newValue === "function") {
                const action = newValue as Function as EffectFunction<S>;
                newValue = (evt) => patch([action, evt]);
            } else if (Array.isArray(newValue) && typeof newValue[0] === "function") {
                const arr = (newValue as Array<any>);
                const action = newValue[0] as EffectFunction<S>;
                if (arr.length > 1) {
                    newValue = () => patch([action, ...arr.slice(1)]);
                }
                else {
                    newValue = (evt) => patch([action, evt]);
                }
            } else if (typeof newValue === "object") {
                newValue = () => patch(newValue as Patch<S>);
            }
            (<any>node)[key] = newValue;
        } else {
            (<any>node)[key] = null;
        }
    } else if (key !== "list" && key !== "form") {
        (<any>node)[key] = newValue
    }

    return newValue;
}

export const createState = <S>(state: S): Patchable<S> => state as Patchable<S>;

/** ## create a vode
 * overloads
 * - just a tag: `v("div") // => ["div"]`
 * - tag and props: `v("div", { class: "foo" }) // => ["div", { class: "foo" }]`
 * - tag, props and children: `v("div", { class: "foo" }, ["span", "bar"]) // => ["div", { class: "foo" }, ["span", "bar"]]`
 * - identity: `v(["div", ["span", "bar"]]) // => ["div", ["span", "bar"]]`
 */
export function vode<S>(tag: Tag | Vode<S>, props?: Props<S> | ChildVode<S>, ...children: ChildVode<S>[]): Vode<S> {
    if (Array.isArray(tag)) {
        return tag;
    }
    if (props) {
        return [tag, props as Props<S>, ...children];
    }
    return [tag, ...children];
}

/**
 * ## create a vode app
 * @param container will use this container as root and places the result of the dom function and further renderings in it
 * @param initialState 
 * @param dom creates the initial dom from the state and is called on every render
 * @param initialPatches variadic list of patches that are applied after the first render
 */
export function app<S>(container: HTMLElement, initialState: Omit<S, "patch">, dom: (state: S, ...payload: any) => Vode<S>, ...initialPatches: Patch<S>[]) {
    const root = container as RootNode<S>;
    root.q = [];

    root.vode = ["div"] as AttachedVode<S>;
    root.vode.node = container.appendChild(document.createElement((<Vode<S>>root.vode)[0]));

    Object.defineProperty(initialState, "patch", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: async (action: Patch<S>) => {
            // const sw = Date.now();
            try {
                if (!action) return;

                if ((action as AsyncGenerator<Patch<S>, unknown, void>)?.next) {
                    const generator = action as AsyncGenerator<Patch<S>, unknown, void>;
                    for await (const value of generator) {
                        root.patch!(value);
                    }
                } else if ((action as Promise<S>).then) {
                    const nextState = await (action as Promise<S>);
                    root.patch!(<Patch<S>>nextState);
                } else if (Array.isArray(action) && typeof action[0] === "function") {
                    if (action.length > 1)
                        root.patch!(action[0](root.state!, ...(action as any[]).slice(1)));
                    else root.patch!(action[0](root.state!));
                } else if (typeof action === "function") {
                    root.patch!((<EffectFunction<S>>action)(root.state as S));
                } else {
                    if (action !== root.state) {
                        root.q!.push(<Partial<S>>action);
                        root.render!();
                    }
                }
            } finally {
                // console.log("patch took", Date.now() - sw, "ms");
            }
        }
    });

    Object.defineProperty(root, "render", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: () => requestAnimationFrame((timestamp) => {
            if (root.isRendering || root.lastRender === timestamp || root.q!.length === 0) return;
            root.isRendering = true;
            // const sw = Date.now();
            try {

                root.lastRender = timestamp;
                const nextState = Object.assign({}, root.state);

                while (root.q!.length > 0) {
                    const patch = root.q!.shift();
                    mergeState(nextState, patch);
                }
                Object.assign(root.state!, nextState);
                root.vode = render(root.patch!, root.vode, dom(root.state!), '');
            }
            finally {
                root.isRendering = false;
                // console.log("render took", Date.now() - sw, "ms");
                if (root.q!.length > 0) {
                    console.log("still patches in queue, continue render");
                    root.render!();
                }
            }
        })
    });

    root.state = <S>initialState;
    root.patch = (<Patchable<S>>initialState).patch;
    root.patch(Object.assign({}, <S>initialState));
    for (const effect of initialPatches) {
        root.patch!(effect);
    }

    return root.patch;
}

const mergeState = (target: any, source: any) => {
    for (const key in source) {
        const value = source[key];
        if (value && typeof value === "object") {
            if (target[key]) {
                if (Array.isArray(value)) {
                    target[key] = value;
                } else {
                    if (Array.isArray(target[key])) target[key] = value;
                    else mergeState(target[key], value);
                }
            } else {
                target[key] = value;
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

export const A: Tag = "a";
export const ABBR: Tag = "abbr";
export const ADDRESS: Tag = "address";
export const AREA: Tag = "area";
export const ARTICLE: Tag = "article";
export const ASIDE: Tag = "aside";
export const AUDIO: Tag = "audio";
export const B: Tag = "b";
export const BASE: Tag = "base";
export const BDI: Tag = "bdi";
export const BDO: Tag = "bdo";
export const BLOCKQUOTE: Tag = "blockquote";
export const BODY: Tag = "body";
export const BR: Tag = "br";
export const BUTTON: Tag = "button";
export const CANVAS: Tag = "canvas";
export const CAPTION: Tag = "caption";
export const CITE: Tag = "cite";
export const CODE: Tag = "code";
export const COL: Tag = "col";
export const COLGROUP: Tag = "colgroup";
export const DATA: Tag = "data";
export const DATALIST: Tag = "datalist";
export const DD: Tag = "dd";
export const DEL: Tag = "del";
export const DETAILS: Tag = "details";
export const DFN: Tag = "dfn";
export const DIALOG: Tag = "dialog";
export const DIV: Tag = "div";
export const DL: Tag = "dl";
export const DT: Tag = "dt";
export const EM: Tag = "em";
export const EMBED: Tag = "embed";
export const FIELDSET: Tag = "fieldset";
export const FIGCAPTION: Tag = "figcaption";
export const FIGURE: Tag = "figure";
export const FOOTER: Tag = "footer";
export const FORM: Tag = "form";
export const H1: Tag = "h1";
export const H2: Tag = "h2";
export const H3: Tag = "h3";
export const H4: Tag = "h4";
export const H5: Tag = "h5";
export const H6: Tag = "h6";
export const HEAD: Tag = "head";
export const HEADER: Tag = "header";
export const HGROUP: Tag = "hgroup";
export const HR: Tag = "hr";
export const HTML: Tag = "html";
export const I: Tag = "i";
export const IFRAME: Tag = "iframe";
export const IMG: Tag = "img";
export const INPUT: Tag = "input";
export const INS: Tag = "ins";
export const KBD: Tag = "kbd";
export const LABEL: Tag = "label";
export const LEGEND: Tag = "legend";
export const LI: Tag = "li";
export const LINK: Tag = "link";
export const MAIN: Tag = "main";
export const MAP: Tag = "map";
export const MARK: Tag = "mark";
export const MENU: Tag = "menu";
export const META: Tag = "meta";
export const METER: Tag = "meter";
export const NAV: Tag = "nav";
export const NOSCRIPT: Tag = "noscript";
export const OBJECT: Tag = "object";
export const OL: Tag = "ol";
export const OPTGROUP: Tag = "optgroup";
export const OPTION: Tag = "option";
export const OUTPUT: Tag = "output";
export const P: Tag = "p";
export const PICTURE: Tag = "picture";
export const PRE: Tag = "pre";
export const PROGRESS: Tag = "progress";
export const Q: Tag = "q";
export const RP: Tag = "rp";
export const RT: Tag = "rt";
export const RUBY: Tag = "ruby";
export const S: Tag = "s";
export const SAMP: Tag = "samp";
export const SCRIPT: Tag = "script";
export const SECTION: Tag = "section";
export const SELECT: Tag = "select";
export const SLOT: Tag = "slot";
export const SMALL: Tag = "small";
export const SOURCE: Tag = "source";
export const SPAN: Tag = "span";
export const STRONG: Tag = "strong";
export const STYLE: Tag = "style";
export const SUB: Tag = "sub";
export const SUMMARY: Tag = "summary";
export const SUP: Tag = "sup";
export const TABLE: Tag = "table";
export const TBODY: Tag = "tbody";
export const TD: Tag = "td";
export const TEMPLATE: Tag = "template";
export const TEXTAREA: Tag = "textarea";
export const TFOOT: Tag = "tfoot";
export const TH: Tag = "th";
export const THEAD: Tag = "thead";
export const TIME: Tag = "time";
export const TITLE: Tag = "title";
export const TR: Tag = "tr";
export const TRACK: Tag = "track";
export const U: Tag = "u";
export const UL: Tag = "ul";
export const VIDEO: Tag = "video";
export const WBR: Tag = "wbr";