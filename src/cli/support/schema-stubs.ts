import path from 'path';
import { existsSync } from 'fs';

export function resolveStubIndex(stubRoot: string, kind: 'enum' | 'model' | 'migration' | 'ts', dirname: string): string {
   const userPath = path.join(stubRoot, kind, 'index.stub');
   const fallbackPath = path.resolve(dirname, '../../stubs', `${kind}.stub`);

   if (existsSync(userPath)) return userPath;
   if (existsSync(fallbackPath)) return fallbackPath;

   throw new Error(`Missing both user and fallback index.stub for kind "${kind}"`);
}
