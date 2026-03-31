import path from "node:path";
import { verifyRunOutput } from "../packages/pipeline/run/src/verify-run-output";

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    throw new Error('Run target is required. Use "npm run verify:run -- <runId-or-runDir>".');
  }

  const repoRoot = process.cwd();
  const result = await verifyRunOutput({
    repoRoot,
    target
  });

  console.info(`status: ${result.status}`);
  console.info(`runDir: ${path.relative(repoRoot, result.runDir) || result.runDir}`);

  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.info(`${issue.severity}: ${issue.message}`);
    }
  }

  if (result.status === "fail") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
