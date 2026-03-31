import path from "node:path";
import { Command } from "commander";
import { executeRun } from "../../../../packages/pipeline/run/src/execute-run";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Execute the local pipeline slice from manual input to decision or generation-planning artifacts.")
    .argument("[requestPath]", "Path to a structured run-request JSON file")
    .option("--request <path>", "Path to a structured run-request JSON file")
    .action(async (requestPathArg: string | undefined, options: { request?: string }) => {
      const providedRequestPath = options.request ?? requestPathArg;
      if (!providedRequestPath) {
        throw new Error('Request path is required. Use "run --request <path>" or "run <path>".');
      }

      const requestPath = path.resolve(process.cwd(), providedRequestPath);
      const repoRoot = process.cwd();

      const result = await executeRun(requestPath, repoRoot);
      console.info(`Run completed: ${result.runId}`);
      console.info(`Artifacts: ${path.relative(repoRoot, result.runDir)}`);
    });
}
