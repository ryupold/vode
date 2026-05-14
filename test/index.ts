import "./mocks";
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
    try {
        test[1]()
        count.passed++;
    } catch (err: any) {
        count.failed++;
        if (err instanceof ExpectationError) {
            console.error(`${test[0]} failed: ${err.message}\n`);
        }
        else {
            console.error(`${test[0]} failed: ${err.message}\n${err.stack}`);
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
    throw "\n\nsome tests failed\n";
}