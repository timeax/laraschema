import fs from 'fs/promises';
import path from 'path';
import {pathToFileURL} from 'url';
import type {ModelerHook, ModelerHookContext} from './hooks.types';

async function loadHook(hook: string | ModelerHook): Promise<ModelerHook> {
    if (typeof hook === 'function') return hook;

    const abs = path.resolve(process.cwd(), hook);
    const mod = await import(pathToFileURL(abs).href);

    const resolved = mod.default ?? mod.hook ?? mod;

    if (typeof resolved !== 'function') {
        throw new Error(`Modeler hook must export a function: ${hook}`);
    }

    return resolved;
}

export async function runModelerHooks(
    hooks: Array<string | ModelerHook> | undefined,
    ctx: Omit<ModelerHookContext, 'writeFile' | 'writeJson'>,
) {
    if (!hooks?.length) return;

    const fullCtx: ModelerHookContext = {
        ...ctx,

        async writeFile(targetPath, content) {
            const abs = path.resolve(process.cwd(), targetPath);
            await fs.mkdir(path.dirname(abs), {recursive: true});
            await fs.writeFile(abs, content, 'utf-8');
        },

        async writeJson(targetPath, value) {
            await this.writeFile(
                targetPath,
                JSON.stringify(value, null, 2) + '\n',
            );
        },
    };

    for (const hookRef of hooks) {
        const hook = await loadHook(hookRef);
        await hook(fullCtx);
    }
}