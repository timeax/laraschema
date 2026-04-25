import path from 'path';

export function getOutputPaths(cfg: any) {
   return {
      migrations: path.resolve(process.cwd(), cfg.output?.migrations ?? 'database/migrations'),
      models: path.resolve(process.cwd(), cfg.output?.models ?? 'app/Models'),
      enums: path.resolve(process.cwd(), cfg.modeler?.outputEnumDir ?? cfg.output?.enums ?? 'app/Enums'),
      backups: path.resolve(process.cwd(), '.laraschema/backups'),
   };
}
