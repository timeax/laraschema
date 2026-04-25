#!/usr/bin/env node
import { generateLaravelModels } from "../generators/models/index.js";
import helperPkg from "@prisma/generator-helper";
import path from "node:path";
import { loadSharedConfig } from "../core/config/load-shared-config.js";

const { generatorHandler } = helperPkg;

generatorHandler({
   onGenerate: generateLaravelModels,

   async onManifest(options) {
      const cfg = (options.config ?? {}) as Record<string, string | undefined>;

      let modelOutput = cfg.outputDir;
      let enumOutput: string | undefined;

      if (options.sourceFilePath) {
         try {
            const schemaDir = path.dirname(options.sourceFilePath);
            const shared = await loadSharedConfig(schemaDir, 'models');

            if (!modelOutput) {
               modelOutput =
                  shared?.modeler?.outputDir ??
                  shared?.output?.models ??
                  undefined;
            }

            enumOutput =
               shared?.modeler?.outputEnumDir ??
               shared?.output?.enums ??
               undefined;
         } catch {
            // ignore
         }
      }

      if (!modelOutput) {
         modelOutput = "app/Models";
      }
      if (!enumOutput) {
         enumOutput = "app/Enums";
      }

      return {
         defaultOutput: modelOutput,
         prettyName: `Laravel Models & Enums (models -> ${modelOutput}, enums -> ${enumOutput})`,
      };
   },
});
