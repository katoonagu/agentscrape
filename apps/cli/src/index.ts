#!/usr/bin/env node

import { Command } from "commander";
import { registerRunCommand } from "./commands/run";

async function main(): Promise<void> {
  const program = new Command();
  program.name("agentscrape").description("Local agentscrape CLI").version("0.1.0");

  registerRunCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
