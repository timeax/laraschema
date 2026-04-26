import type {EnumDefinition, ModelDefinition} from './model.types';

export interface ModelerHookContext {
    models: ModelDefinition[];
    enums: EnumDefinition[];
    config: unknown;
    writeFile: (path: string, content: string) => Promise<void>;
    writeJson: (path: string, value: unknown) => Promise<void>;
}

export type ModelerHook = (
    ctx: ModelerHookContext,
) => void | Promise<void>;