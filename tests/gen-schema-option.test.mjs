import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "dist", "bin", "cli.js");

function runCli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

async function writeConfig(configPath, extra = "") {
  await writeFile(
    configPath,
    `module.exports = {
  output: {
    migrations: "generated/migrations",
    models: "generated/models",
    enums: "generated/enums",
    ts: "generated/types",
  },
  migrate: {
    outputDir: "generated/migrations",
  },
  modeler: {
    outputDir: "generated/models",
    outputEnumDir: "generated/enums",
  },
  ts: {
    outputDir: "generated/types",
    declaration: true,
  },
  ${extra}
};`,
    "utf8",
  );
}

async function writeSchemaRoot(schemaDir, modelName = "User") {
  await mkdir(path.join(schemaDir, "models"), { recursive: true });
  await writeFile(
    path.join(schemaDir, "schema.prisma"),
    `datasource db {
  provider = "sqlite"
}

generator migrations {
  provider = "laraschema-migrations"
  outputDir = "generated/migrations"
}

generator models {
  provider = "laraschema-models"
  outputDir = "generated/models"
  outputEnumDir = "generated/enums"
}

generator types {
  provider = "laraschema-types"
  outputDir = "generated/types"
  declaration = "true"
}
`,
    "utf8",
  );
  await writeFile(
    path.join(schemaDir, "models", `${modelName.toLowerCase()}.prisma`),
    `model ${modelName} {
  id   Int    @id @default(autoincrement())
  name String
}
`,
    "utf8",
  );
}

test("gen --schema accepts a directory and includes nested prisma files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-gen-schema-dir-"));
  const schemaDir = path.join(root, "prisma");
  const configPath = path.join(root, "laraschema.config.js");

  try {
    await writeSchemaRoot(schemaDir, "User");
    await writeConfig(configPath);

    const run = runCli(
      ["gen", "--config=laraschema.config.js", "--schema=./prisma", "--skipGenerate"],
      root,
    );

    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.ok(
      existsSync(path.join(root, "generated", "models", "User.php")),
      "Expected nested prisma model to be included in generated models",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("gen --schema accepts a schema.prisma file path", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-gen-schema-file-"));
  const schemaDir = path.join(root, "prisma");
  const configPath = path.join(root, "laraschema.config.js");

  try {
    await writeSchemaRoot(schemaDir, "Account");
    await writeConfig(configPath);

    const run = runCli(
      [
        "gen",
        "--config=laraschema.config.js",
        "--schema=./prisma/schema.prisma",
        "--skipGenerate",
      ],
      root,
    );

    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.ok(
      existsSync(path.join(root, "generated", "models", "Account.php")),
      "Expected schema.prisma path to continue loading related schema files",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("gen --schema overrides config schemaPath", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-gen-schema-precedence-"));
  const configuredSchemaDir = path.join(root, "configured-prisma");
  const cliSchemaDir = path.join(root, "cli-prisma");
  const configPath = path.join(root, "laraschema.config.js");

  try {
    await writeSchemaRoot(configuredSchemaDir, "ConfiguredOnly");
    await writeSchemaRoot(cliSchemaDir, "CliOnly");
    await writeConfig(configPath, 'schemaPath: "./configured-prisma",');

    const run = runCli(
      ["gen", "--config=laraschema.config.js", "--schema=./cli-prisma", "--skipGenerate"],
      root,
    );

    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.ok(
      existsSync(path.join(root, "generated", "models", "CliOnly.php")),
      "Expected CLI schema path to win over config schemaPath",
    );
    assert.equal(
      existsSync(path.join(root, "generated", "models", "ConfiguredOnly.php")),
      false,
      "Did not expect model from config schemaPath when CLI --schema is provided",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("gen accepts a directory schemaPath from config", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-gen-schema-config-dir-"));
  const schemaDir = path.join(root, "prisma");
  const configPath = path.join(root, "laraschema.config.js");

  try {
    await writeSchemaRoot(schemaDir, "ConfigDirectory");
    await writeConfig(configPath, 'schemaPath: "./prisma",');

    const run = runCli(["gen", "--config=laraschema.config.js", "--skipGenerate"], root);

    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.ok(
      existsSync(path.join(root, "generated", "models", "ConfigDirectory.php")),
      "Expected config schemaPath directory to include nested prisma files",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("gen passes the resolved schema path to prisma generate", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-gen-schema-prisma-"));
  const shimDir = path.join(root, "bin");
  const schemaDir = path.join(root, "prisma");
  const configPath = path.join(root, "laraschema.config.js");
  const argsPath = path.join(root, "npx-args.txt");

  try {
    await writeSchemaRoot(schemaDir, "User");
    await writeConfig(configPath);
    await mkdir(shimDir, { recursive: true });

    if (process.platform === "win32") {
      await writeFile(
        path.join(shimDir, "npx.cmd"),
        `@echo off\r\necho %* > "${argsPath}"\r\nexit /b 0\r\n`,
        "utf8",
      );
    } else {
      await writeFile(
        path.join(shimDir, "npx"),
        `#!/usr/bin/env sh\nprintf '%s\\n' "$*" > "${argsPath}"\nexit 0\n`,
        { encoding: "utf8", mode: 0o755 },
      );
    }

    const run = runCli(
      ["gen", "--config=laraschema.config.js", "--schema=./prisma"],
      root,
      {
        PATH: `${shimDir}${path.delimiter}${process.env.PATH ?? ""}`,
      },
    );

    assert.equal(run.status, 0, run.stderr || run.stdout);

    const args = await readFile(argsPath, "utf8");
    assert.match(args, /\bprisma\s+generate\b/);
    assert.match(args, new RegExp(`--schema=${schemaDir.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
