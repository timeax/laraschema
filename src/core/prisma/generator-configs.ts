import * as dmf from "@prisma/internals";

/** extract our generator blocks' configs right from the datamodel */
export async function getLaravelGeneratorConfigs(datamodel: string) {
   const sdk = (dmf as any).default ?? dmf;
   const { generators } = await sdk.getConfig({ datamodel });

   const findCfg = (provider: string) =>
      (generators ?? []).find((g: any) => (g.provider?.value ?? "") === provider)?.config ?? {};

   const migCfg = findCfg("laraschema-migrations") as Record<string, string>;
   const modCfg = findCfg("laraschema-models") as Record<string, string>;
   const tsCfg = findCfg('laraschema-types') as Record<string, string>;

   return { migCfg, modCfg, tsCfg };
}