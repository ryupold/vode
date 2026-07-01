import { tests } from ".";
import { expect, ExpectationError } from "./helper";
import { resetMocks } from "./mocks";

const count = {
    total: 0,
    passed: 0,
    failed: <string[]>[],
};
const line = "----------------------------------";

async function runTest(test: [string, () => any]) {
    count.total++;
    resetMocks();
    const start = performance.now();
    try {
        expect(document).toBeNotHidden();
        const result = test[1]();
        if (result && typeof (result as any)?.then === "function") {
            await result;
        }
        count.passed++;
        const time = (performance.now() - start).toFixed(3) + " ms";
        console.log(`#${count.total} ${test[0]}\n-> 🟢 passed ${time}\n${line}`);
    } catch (err: any) {
        const time = (performance.now() - start).toFixed(3) + " ms";
        console.error(`#${count.total} ${test[0]}\n-> 🔴 failed ${time}`);
        if (err instanceof ExpectationError) {
            count.failed.push(`#${count.total} ${test[0]}\n-> 🔴 failed:\n${err.message}\n${line}`);
        } else {
            count.failed.push(
                `#${count.total} ${test[0]}\n-> 🔴 failed:\n${err.message}\n${err.stack}\n${line}`,
            );
        }
    }
}

const sw = performance.now();
(async () => {
    for (const test of Object.entries(tests)) {
        await runTest(test);
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
    } else {
        console.error(
            `${line.replaceAll("-", "=")}\nError summary:\n\n${count.failed.join(`\n${line}\n`)}`,
        );

        throw "\n\nsome tests failed (see output)\n";
    }
})();
