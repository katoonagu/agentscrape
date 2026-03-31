import path from "node:path";
import YAML from "yaml";
import { readTextFile } from "../../../shared/src/fs";
import type { NichePreset } from "../../../shared/src/contracts";
import { SchemaValidator } from "../../../shared/src/schema";

const PRESET_FILES = [
  "global-defaults.yaml",
  "beauty-salon.yaml",
  "dental-clinic.yaml",
  "legal-services.yaml"
] as const;

let cachedRepoRoot: string | null = null;
let cachedPresets: NichePreset[] | null = null;

export async function loadPresets(repoRoot: string, validator: SchemaValidator): Promise<NichePreset[]> {
  if (cachedRepoRoot === repoRoot && cachedPresets) {
    return cachedPresets;
  }

  const presets: NichePreset[] = [];
  for (const fileName of PRESET_FILES) {
    const filePath = path.join(repoRoot, "packages", "niche-presets", fileName);
    const rawText = await readTextFile(filePath);
    const parsed = YAML.parse(rawText);
    const preset = await validator.validate("niche-preset", parsed);
    if (preset.status === "active") {
      presets.push(preset);
    }
  }

  cachedRepoRoot = repoRoot;
  cachedPresets = presets;
  return presets;
}
