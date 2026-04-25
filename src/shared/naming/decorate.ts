export interface NameOpts {
   tablePrefix?: string;
   tableSuffix?: string;
}

export function decorate(name: string, opts: NameOpts): string {
   const pre = opts.tablePrefix ?? "";
   const suf = opts.tableSuffix ?? "";
   return `${pre}${name}${suf}`.trim();
}
