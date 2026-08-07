import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this smoke test with npm run test:package");

function npm(args, options = {}) {
    return execFileSync(process.execPath, [npmCli, ...args], options);
}

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), "vode-package-smoke-"));

try {
    const packed = JSON.parse(npm(
        ["pack", packageRoot, "--json", "--ignore-scripts", "--pack-destination", temporaryRoot],
        { encoding: "utf8" },
    ));
    const tarball = join(temporaryRoot, packed[0].filename);

    writeFileSync(join(temporaryRoot, "package.json"), JSON.stringify({ private: true }));
    npm(
        ["install", tarball, "--ignore-scripts", "--no-audit", "--no-fund"],
        { cwd: temporaryRoot, stdio: "inherit" },
    );

    execFileSync(
        process.execPath,
        ["--input-type=module", "--eval", "const vode = await import('@ryupold/vode'); if (typeof vode.app !== 'function') throw new Error('ESM app export is missing');"],
        { cwd: temporaryRoot, stdio: "inherit" },
    );
    execFileSync(
        process.execPath,
        ["--eval", "const vode = require('@ryupold/vode'); if (typeof vode.app !== 'function') throw new Error('CommonJS app export is missing');"],
        { cwd: temporaryRoot, stdio: "inherit" },
    );

    console.log("Packed ESM and CommonJS consumer smoke tests passed.");
} finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
}
