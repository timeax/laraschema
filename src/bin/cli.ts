#!/usr/bin/env node
import { Command } from 'commander';
import { registerCliCommands } from '@/cli';

const cli = new Command();

cli
   .name('laraschema')
   .description('Initialize and customize Prisma to Laravel generators & stubs')
   .version('0.1.0');

registerCliCommands(cli);
cli.parse(process.argv);
