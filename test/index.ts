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

const tests = {
    ...vodeTests,
    ...appTests,
    ...defuseTests,
    ...hydrateTests,
    ...memoTests,

    ...createStateTests,
    ...createPatchTests,

    ...tagTests,
    ...propsTests,
    ...childrenTests,

    ...mergeClassTests,
    ...mergeStyleTests,
    ...mergePropsTests,

    ...stateContextTests,
};
//===================================================

const count = {
    total: 0,
    passed: 0,
    failed: 0,
}
const line = "----------------------------------";

for (const test of Object.entries(tests)) {
    count.total++;
    resetMocks();
    try {
        test[1]()
        count.passed++;
        console.log(`#${count.total} ${test[0]}\n-> passed\n${line}`);
    } catch (err: any) {
        count.failed++;
        if (err instanceof ExpectationError) {
            console.error(`#${count.total} ${test[0]}\n-> failed:\n${err.message}\n${line}`);
        }
        else {
            console.error(`#${count.total} ${test[0]}\n-> failed:\n${err.message}\n${err.stack}\n${line}`);
        }
    }
}

console.log(`
    total: ${count.total}
    passed: ${count.passed}
    failed: ${count.failed}
`);

if (count.passed === count.total) {
    console.log("\n\nall tests passed\n");
}
else {
    throw "\n\nsome tests failed (see output)\n";
}