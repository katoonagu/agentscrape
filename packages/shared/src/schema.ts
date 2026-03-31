import path from "node:path";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { readJsonFile } from "./fs";
import type {
  DecisionArtifact,
  LeadArtifact,
  OperatorAuditLog,
  QualificationArtifact,
  RunManifest,
  RunRequest,
  SiteSnapshotArtifact
} from "./contracts";

export type SchemaName =
  | "approval-request"
  | "approval-response"
  | "demo-build-plan"
  | "design-seed"
  | "operator-override"
  | "preview-manifest"
  | "redesign-brief"
  | "review-dossier"
  | "run-request"
  | "lead"
  | "site-snapshot"
  | "qualification"
  | "decision"
  | "run-manifest"
  | "operator-audit-log"
  | "skill-registry"
  | "skill-install-plan"
  | "acceptance-checklist"
  | "validation-report";

export interface SchemaTypeMap {
  "approval-request": unknown;
  "approval-response": unknown;
  "demo-build-plan": unknown;
  "design-seed": unknown;
  "operator-override": unknown;
  "preview-manifest": unknown;
  "redesign-brief": unknown;
  "review-dossier": unknown;
  "run-request": RunRequest;
  lead: LeadArtifact;
  "site-snapshot": SiteSnapshotArtifact;
  qualification: QualificationArtifact;
  decision: DecisionArtifact;
  "run-manifest": RunManifest;
  "operator-audit-log": OperatorAuditLog;
  "skill-registry": unknown;
  "skill-install-plan": unknown;
  "acceptance-checklist": unknown;
  "validation-report": unknown;
}

const SCHEMA_FILES: Record<SchemaName, string> = {
  "approval-request": "approval-request.schema.json",
  "approval-response": "approval-response.schema.json",
  "demo-build-plan": "demo-build-plan.schema.json",
  "design-seed": "design-seed.schema.json",
  "operator-override": "operator-override.schema.json",
  "preview-manifest": "preview-manifest.schema.json",
  "redesign-brief": "redesign-brief.schema.json",
  "review-dossier": "review-dossier.schema.json",
  "run-request": "run-request.schema.json",
  lead: "lead.schema.json",
  "site-snapshot": "site-snapshot.schema.json",
  qualification: "qualification.schema.json",
  decision: "decision.schema.json",
  "run-manifest": "run-manifest.schema.json",
  "operator-audit-log": "operator-audit-log.schema.json",
  "skill-registry": "skill-registry.schema.json",
  "skill-install-plan": "skill-install-plan.schema.json",
  "acceptance-checklist": "acceptance-checklist.schema.json",
  "validation-report": "validation-report.schema.json"
};

export class SchemaValidator {
  private readonly ajv: Ajv;
  private readonly validators = new Map<SchemaName, ValidateFunction>();

  public constructor(private readonly repoRoot: string) {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false
    });
    addFormats(this.ajv);
  }

  public async validate<TSchemaName extends SchemaName>(
    schemaName: TSchemaName,
    data: unknown
  ): Promise<SchemaTypeMap[TSchemaName]> {
    const validator = await this.getValidator<SchemaTypeMap[TSchemaName]>(schemaName);
    if (!validator(data)) {
      throw new Error(`Schema validation failed for ${schemaName}: ${formatAjvErrors(validator.errors ?? [])}`);
    }

    return data as SchemaTypeMap[TSchemaName];
  }

  private async getValidator<T>(schemaName: SchemaName): Promise<ValidateFunction<T>> {
    const existing = this.validators.get(schemaName) as ValidateFunction<T> | undefined;
    if (existing) {
      return existing;
    }

    const schemaPath = path.join(this.repoRoot, "packages", "schemas", SCHEMA_FILES[schemaName]);
    const schema = (await readJsonFile<unknown>(schemaPath)) as object;
    const validator = this.ajv.compile<T>(schema);
    this.validators.set(schemaName, validator);
    return validator;
  }
}

function formatAjvErrors(errors: ErrorObject[]): string {
  return errors
    .map((error) => {
      const instancePath = error.instancePath || "/";
      return `${instancePath} ${error.message ?? "validation error"}`.trim();
    })
    .join("; ");
}
