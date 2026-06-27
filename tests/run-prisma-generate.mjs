import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const shimDir = path.join(
  tmpdir(),
  `laraschema-prisma-shims-${process.pid}-${Date.now()}`,
);

const bins = {
  "laraschema-models": "prisma-models",
  "laraschema-migrations": "prisma-migrations",
  "laraschema-types": "prisma-types",
};

async function writeShim(command, binName) {
  const target = path.join(repoRoot, "dist", "bin", `${binName}.js`);

  if (process.platform === "win32") {
    await writeFile(
      path.join(shimDir, `${command}.cmd`),
      `@echo off\r\nnode "${target}" %*\r\n`,
      "utf8",
    );
    return;
  }

  await writeFile(
    path.join(shimDir, command),
    `#!/usr/bin/env sh\nexec node "${target}" "$@"\n`,
    { encoding: "utf8", mode: 0o755 },
  );
}

function runPrismaGenerate() {
  return new Promise((resolve) => {
    const child = spawn(
      "npx prisma generate --schema=tests/small.prisma",
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          PATH: `${shimDir}${path.delimiter}${process.env.PATH ?? ""}`,
        },
        shell: true,
        stdio: "inherit",
      },
    );

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
  });
}

await mkdir(shimDir, { recursive: true });

try {
  await Promise.all(
    Object.entries(bins).map(([command, binName]) => writeShim(command, binName)),
  );

  process.exitCode = await runPrismaGenerate();
} finally {
  await rm(shimDir, { recursive: true, force: true });
}
