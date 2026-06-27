import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const generatedPaths = [
  path.join(repoRoot, "database"),
  path.join(repoRoot, ".laraschema", "backups", "database"),
];

await Promise.all(
  generatedPaths.map((target) => rm(target, { recursive: true, force: true })),
);
