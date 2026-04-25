// utils/loadSharedCfg.ts
import fs from "fs";
import { LaravelSharedConfig } from "./laravel-config.types";
import path from "path";
import { loadConfig } from "./load-config.js";
/** ---------------- shared-config loader ---------------- */
export async function loadSharedConfig(schemaDir: string, type: string): Promise<LaravelSharedConfig> {
  const envOverride = process.env.PRISMA_LARAVEL_CFG;
  const defaultPath = path.join(schemaDir, "laraschema.config.js");
  const cfgPath = envOverride ? path.resolve(envOverride) : defaultPath;

  console.log("Loading shared config for "+ type +" from - " + cfgPath)

  try {
    fs.accessSync(cfgPath);
    const mod = await loadConfig(cfgPath);
    return (mod.default ?? mod) as LaravelSharedConfig;
  } catch (err) {
    console.error((err as Error).message);
    return {}; // no shared config
  }
}