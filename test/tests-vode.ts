import { vode, DIV, Vode, SPAN, STRONG } from "../index";
import { expect } from "./helper";

export default {
    "vode(): passing an already constructed vode returns it": async () => {
        const testVode: Vode = [DIV, { class: 'test' }, "hello world"];

        await expect(vode(testVode)).toEqual(testVode);
    },

    "vode(): constructing a vode from parts": async () => {
        await expect(
            vode(DIV, { class: 'test' },
                [SPAN, "hello"],
                [STRONG, { style: 'color: green' }, "world"])
        ).toEqual(
            [DIV, { class: 'test' },
                [SPAN, "hello"],
                [STRONG, { style: 'color: green' }, "world"]]
        );
    },

    "vode(): passing an invalid tag fails": async () => {
        const err = expect(() => vode(null as any)).toFail();
        await expect(err.message).toEqual("first argument to vode() must be a tag name or a vode");
    }
};