import { readdirSync } from "fs";
import fs from "fs/promises";
import path from "path";

// utility: load/merge ALL *.prisma files under prisma/ (schema first, then the rest)
export async function loadMergedDatamodel(schemaPrismaPath: string): Promise<string> {
   const schemaDir = path.dirname(schemaPrismaPath);
   const entries = readdirSync(schemaDir).filter(f => f.endsWith(".prisma"));
   const order = [
      ...entries.filter(f => f === "schema.prisma"),
      ...entries.filter(f => f !== "schema.prisma").sort(),
   ];
   const chunks = await Promise.all(order.map(f => fs.readFile(path.join(schemaDir, f), "utf-8")));
   return chunks.join("\n\n");
}