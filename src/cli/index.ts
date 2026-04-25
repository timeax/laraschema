import { Command } from 'commander';
import { registerInitCommand } from './commands/init';
import { registerCustomizeCommand } from './commands/customize';
import { registerGenerateCommand } from './commands/generate';
import { registerListCommand } from './commands/list';
import { registerCleanCommand } from './commands/clean';

export function registerCliCommands(cli: Command) {
   registerInitCommand(cli);
   registerCustomizeCommand(cli);
   registerGenerateCommand(cli);
   registerListCommand(cli);
   registerCleanCommand(cli);
}
