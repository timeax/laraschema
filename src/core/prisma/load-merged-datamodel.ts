import { statSync } from "fs";
import * as prismaInternals from "@prisma/internals";
import path from "path";

export type LoadedPrismaSchema = {
   datamodel: string;
   schemaPath: string;
   schemaRootDir: string;
   sourceFilePath: string;
};

function getPrismaSdk() {
   return (prismaInternals as any).default ?? prismaInternals;
}

function orderSchemaFiles(files: Array<[string, string]>, schemaRootDir: string) {
   const mainSchemaPath = path.join(schemaRootDir, "schema.prisma");

   return [...files].sort(([left], [right]) => {
      if (path.resolve(left) === path.resolve(mainSchemaPath)) return -1;
      if (path.resolve(right) === path.resolve(mainSchemaPath)) return 1;
      return left.localeCompare(right);
   });
}

function resolveSchemaLoadPath(schemaPath: string) {
   const stats = statSync(schemaPath);
   return stats.isDirectory() ? schemaPath : path.dirname(schemaPath);
}

export async function loadMergedDatamodel(schemaPath: string): Promise<string> {
   const schema = await loadPrismaSchema(schemaPath);
   return schema.datamodel;
}

export async function loadPrismaSchema(schemaPath: string): Promise<LoadedPrismaSchema> {
   const sdk = getPrismaSdk();
   const schemaLoadPath = resolveSchemaLoadPath(schemaPath);
   const schemaResult = await sdk.getSchemaWithPath({
      schemaPath: {cliProvidedPath: schemaLoadPath},
      cwd: process.cwd(),
      argumentName: "--schema",
   });

   const orderedFiles = orderSchemaFiles(schemaResult.schemas, schemaResult.schemaRootDir);

   return {
      datamodel: orderedFiles.map(([, content]) => content).join("\n\n"),
      schemaPath,
      schemaRootDir: schemaResult.schemaRootDir,
      sourceFilePath: path.join(schemaResult.schemaRootDir, "schema.prisma"),
   };
}
