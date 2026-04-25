import * as dmf from "@prisma/internals";

export function getPrismaSdk() {
   return (dmf as any).default ?? dmf;
}

export async function getDMMF(datamodel: string) {
   const sdk = getPrismaSdk();
   return sdk.getDMMF({ datamodel });
}