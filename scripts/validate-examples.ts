import path from "node:path";
import fs from "fs-extra";
import { SchemaValidator, type SchemaName } from "../packages/shared/src/schema";
import { readJsonFile } from "../packages/shared/src/fs";

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const validator = new SchemaValidator(repoRoot);
  const schemaDir = path.join(repoRoot, "packages", "schemas");
  const fileNames = (await fs.readdir(schemaDir)).filter(
    (name: string) => name.endsWith(".example.json") && !name.startsWith("site-snapshot")
  );

  for (const fileName of fileNames) {
    const schemaName = inferSchemaName(fileName);
    const filePath = path.join(schemaDir, fileName);
    const payload = await readJsonFile<unknown>(filePath);
    await validator.validate(schemaName, payload);
    console.info(`validated ${path.relative(repoRoot, filePath)}`);
  }

  const extraArtifacts: Array<{ filePath: string; schemaName: SchemaName }> = [
    {
      filePath: path.join(repoRoot, "packages", "skills", "registry.json"),
      schemaName: "skill-registry"
    },
    {
      filePath: path.join(repoRoot, "packages", "skills", "install-plan.json"),
      schemaName: "skill-install-plan"
    }
  ];

  for (const artifact of extraArtifacts) {
    const payload = await readJsonFile<unknown>(artifact.filePath);
    await validator.validate(artifact.schemaName, payload);
    console.info(`validated ${path.relative(repoRoot, artifact.filePath)}`);
  }
}

function inferSchemaName(fileName: string): SchemaName {
  const normalized = fileName.replace(/\.example\.json$/u, "");
  const baseName = normalized.endsWith(".audit-only") ? normalized.replace(/\.audit-only$/u, "") : normalized;
  return baseName as SchemaName;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
