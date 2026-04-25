#!/usr/bin/env node
import { generateLaravelSchema } from "../generators/migrations/index.js";
import helperPkg from "@prisma/generator-helper";
import path from "node:path";
import { loadSharedConfig } from "../core/config/load-shared-config.js";

const { generatorHandler } = helperPkg;

generatorHandler({
   onGenerate: generateLaravelSchema,

   async onManifest(options) {
      const cfg = (options.config ?? {}) as Record<string, string | undefined>;

      let migrationsOutput: string | undefined;

      migrationsOutput = cfg.outputDir;

      if (!migrationsOutput && options.sourceFilePath) {
         try {
            const schemaDir = path.dirname(options.sourceFilePath);
            const shared = await loadSharedConfig(schemaDir, 'models');

            migrationsOutput =
               shared?.migrate?.outputDir ??
               shared?.output?.migrations ??
               undefined;
         } catch {
            // ignore
         }
      }

      if (!migrationsOutput) {
         migrationsOutput = "database/migrations";
      }

      return {
         defaultOutput: migrationsOutput,
         prettyName: `Laravel Migration Schema (migrations -> ${migrationsOutput})`,
      };
   },
});
