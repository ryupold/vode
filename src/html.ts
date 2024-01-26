import { Props, Vode } from "./vode.js";

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

function elementToVode<S>(element: Element): Vode<S> | string | undefined | null {
    if (element.nodeType === Node.TEXT_NODE) {
        return element.textContent;
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
