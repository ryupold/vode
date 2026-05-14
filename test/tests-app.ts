import { expect } from "./helper";
import { app, DIV } from "../index";

export default {
    "app: init vode-app": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const patch = expect(() => app(container, {}, () => [DIV]))
            .toSucceed();

        expect(patch).toBeA("function");
    },

    "app: init vode-app fails when the container": () => {
        const container = document.createElement("div");
        const err = expect(() => app(container, {}, () => [DIV]))
            .toFail();

        expect(err.message).toEqual("first argument to app() must be a valid HTMLElement inside the <html></html> document");
    },
};