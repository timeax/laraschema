#!/usr/bin/env node

import { generateTypesFromPrisma } from "../generators/typescript/index.js";
import helperPkg from "@prisma/generator-helper";
import path from "node:path";
import { loadSharedConfig } from "../core/config/load-shared-config.js";

const { generatorHandler } = helperPkg;

generatorHandler({
   onGenerate: generateTypesFromPrisma,

   async onManifest(options) {
      const cfg = (options.config ?? {}) as Record<string, string | undefined>;
      let defaultOutput = cfg.outputDir;

      if (!defaultOutput && options.sourceFilePath) {
         try {
            const schemaDir = path.dirname(options.sourceFilePath);
            const shared = await loadSharedConfig(schemaDir, 'typescript');

            if (shared && (shared as any).ts) {
               defaultOutput = (shared as any).ts.outputDir;
            }
         } catch {
            // ignore
         }
      }

      if (!defaultOutput) {
         defaultOutput = "resources/js/types";
      }

      return {
         defaultOutput,
         prettyName: "Typescript declarations",
      };
   },
});
