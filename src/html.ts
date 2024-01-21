
import { DIV } from "./vode-tags.js";
import { ChildVode, Props, Vode } from "./vode.js";

export function htmlToVode<S extends object | unknown>(html: string): (Vode<S> | string)[] {
    const div = document.createElement('div');
    div.innerHTML = html.trim();

    const vodes: (Vode<S> | string)[] = [];
    for (const child of div.childNodes) {
        const v = elementToVode<S>(<Element>child);
        if (v != null) vodes.push(v);
    }
    return vodes;
}

function elementToVode<S>(element: Element): Vode<S> | string | undefined {
    if (element.nodeType === Node.TEXT_NODE) {
        return element.textContent?.trim();
    }
    if (element.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }
    const vode = <Vode<S>>[element.tagName.toLowerCase()];

    if (element.hasAttributes()) {
        const props = <Props<S>>{};
        for (const att of element.attributes) {
            props[att.name] = att.value;
        }
        (<any[]>vode).push(props);
    }

    for (const child of element.childNodes) {
        const v = elementToVode(<Element>child);
        if (v && (typeof v !== "string" || v.length > 0)) (<any[]>vode).push(v);
    }
    return vode;
}

declare var showdown: any;
let _remarkable: any;
export function mdToVode<S = any>(md: string) {
    if (!_remarkable) {
        _remarkable = new showdown.Converter();
    }
    console.log(_remarkable.makeHtml(md));
    return htmlToVode<S>(_remarkable.makeHtml(md));
}