import path from "path";
import { mkdirSync, existsSync } from "fs";

/** project-level hidden folder */
const BACKUP_ROOT = path.resolve(process.cwd(), ".laraschema", "backups");

/** Returns `<root>/.laraschema/backups/<relative-to-cwd>.bak` */
export function backupPathFor(targetFile: string): string {
   const rel = path.relative(process.cwd(), targetFile);
   const full = path.join(BACKUP_ROOT, rel + ".bak");
   const dir = path.dirname(full);
   if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
   return full;
}