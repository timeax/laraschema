import { ModelConfig } from "@/generators/models";
import { MigratorConfig } from "@/generators/migrations";
import { TypesConfig } from "@/generators/typescript";

type GlobalCfg = {
   model?: ModelConfig;
   migrator?: MigratorConfig;
   typescript?: TypesConfig;
};

let config: GlobalCfg = {};

export function addToConfig(key: 'model' | 'migrator' | 'typescript', value: any) {
   config[key] = value;
}

export function getConfig<K extends keyof GlobalCfg>(key: K): GlobalCfg[K];
export function getConfig<
   K extends keyof GlobalCfg,
   P extends keyof NonNullable<GlobalCfg[K]>
>(
   key: K,
   property: P
): NonNullable<GlobalCfg[K]>[P] | undefined;

export function getConfig(
   key: keyof GlobalCfg,
   property?: string
) {
   const cfg = config;
   const section = cfg[key];
   return property ? (section as any)?.[property] : section;
}
