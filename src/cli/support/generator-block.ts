export function generatorBlock(
   base: 'migration' | 'model',
   stubDirRel: string,
   extras: string[] = [],
): string {
   const name = `${base}s`;
   const provider = `laraschema-${name}`;
   const extra = extras.length ? '\n  ' + extras.join('\n  ') : '';
   return `
generator ${name} {
  provider = "${provider}"
  stubDir  = "${stubDirRel}"${extra}
}
`;
}
