import { resetMocks } from "./mocks";
import { ExpectationError } from "./helper";

//=== REGISTERED TESTS =========================================
import vodeTests from "./tests-vode";
import appTests from "./tests-app";
import defuseTests from "./tests-defuse";
import hydrateTests from "./tests-hydrate";
import memoTests from "./tests-memo";
import createStateTests from "./tests-createState";
import createPatchTests from "./tests-createPatch";
import tagTests from "./tests-tag";
import childrenTests from "./tests-children";
import propsTests from "./tests-props";
import mergeClassTests from "./tests-mergeClass";
import mergeStyleTests from "./tests-mergeStyle";
import mergePropsTests from "./tests-mergeProps";
import stateContextTests from "./tests-state-context";
import mountUnmountTests from "./tests-mount-unmount";
import exampleTests from "./tests-examples";

const tests = {
    ...vodeTests,
    ...appTests,
    ...defuseTests,
    ...hydrateTests,
    ...memoTests,
    ...mountUnmountTests,

    ...createStateTests,
    ...createPatchTests,

    ...tagTests,
    ...propsTests,
    ...childrenTests,

    ...mergeClassTests,
    ...mergeStyleTests,
    ...mergePropsTests,

    ...stateContextTests,
    ...exampleTests,
};
//===================================================

const count = {
    total: 0,
    passed: 0,
    failed: <string[]>[],
}
const line = "----------------------------------";

const sw = performance.now();
for (const test of Object.entries(tests)) {
    count.total++;
    resetMocks();
    const start = performance.now();
    try {
        test[1]()
        count.passed++;
        const time = (performance.now() - start).toFixed(3) + " ms";
        console.log(`#${count.total} ${test[0]}\n-> 🟢 passed ${time}\n${line}`);
    } catch (err: any) {
        const time = (performance.now() - start).toFixed(3) + " ms";
        console.error(`#${count.total} ${test[0]}\n-> 🔴 failed ${time}`);
        if (err instanceof ExpectationError) {
            count.failed.push(`#${count.total} ${test[0]}\n-> 🔴 failed:\n${err.message}\n${line}`);
        }
        else {
            count.failed.push(`#${count.total} ${test[0]}\n-> 🔴 failed:\n${err.message}\n${err.stack}\n${line}`);
        }
    }
}

const time = (performance.now() - sw).toFixed(3) + " ms";

console.log(`
    total: ${count.total}
    passed: ${count.passed}
    failed: ${count.failed.length}

    time: ${time}
`);

if (count.passed === count.total) {
    console.log("\n\nall tests passed\n");
}
else {
    console.error(`${line.replaceAll("-", "=")}\nError summary:\n\n${count.failed.join(`\n${line}\n`)}`);

    throw "\n\nsome tests failed (see output)\n";
}