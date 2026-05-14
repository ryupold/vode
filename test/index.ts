import { resetMocks } from "./mocks";
import { ExpectationError } from "./helper";
import appTests from "./tests-app";

const tests = {
    ...appTests,
};

const count = {
    total: 0,
    passed: 0,
    failed: 0,
}

for (const test of Object.entries(tests)) {
    count.total++;
    resetMocks();
    try {
        test[1]()
        count.passed++;
    } catch (err: any) {
        count.failed++;
        const line = "----------------------------------";
        if (err instanceof ExpectationError) {
            console.error(`#${count.total} ${test[0]} failed:\n${err.message}\n${line}`);
        }
        else {
            console.error(`#${count.total} ${test[0]} failed:\n${err.message}\n${err.stack}\n${line}`);
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