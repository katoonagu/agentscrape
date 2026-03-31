export type WorkMode = "autopilot" | "checkpointed" | "audit-only";
export type InputMode = "scrape" | "manual-list";
export type ExecutionBoundary = "decision" | "generation" | "preview" | "review";
export type RunState =
  | "RUN_CREATED"
  | "INPUT_SELECTED"
  | "INGESTING"
  | "NORMALIZED"
  | "DEDUPED_BY_DOMAIN"
  | "QUALIFYING"
  | "DECISION_MADE"
  | "GENERATING_DEMO"
  | "INTERNAL_QA"
  | "AWAITING_APPROVAL"
  | "DEPLOYING_PREVIEW"
  | "PREVIEW_READY"
  | "GENERATING_REVIEW"
  | "RUN_DONE"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL"
  | "CANCELLED"
  | "PARTIAL_DONE";
export type PipelineDecision = "SKIP" | "AUDIT_ONLY" | "DEMO_FRONT_ONLY" | "DEMO_EDITABLE_CONTENT";
export type ReasonCode =
  | "NO_SITE"
  | "DUPLICATE_DOMAIN"
  | "LOW_UPLIFT"
  | "LOW_FEASIBILITY"
  | "TOO_COMPLEX"
  | "LOW_CONFIDENCE"
  | "BLOCKED_BY_ANTI_BOT"
  | "EXTERNAL_FLOW_PRESERVED"
  | "ENOUGH_CONTENT_FOR_EDITABLE_DEMO";
export type ApprovalTrigger = "EXTERNAL_FLOW_CASE" | "CONFLICTING_SCORES" | "LOW_CONFIDENCE_BORDERLINE";
export type SelectionMode = "STANDARD_3_PAGE" | "ONE_PAGE_VIRTUAL_SECTIONS";
export type AccessBarrier = "NONE" | "ANTI_BOT" | "GEO" | "CHALLENGE";
export type ExternalFlow = "NONE" | "EXTERNAL_BOOKING_OR_WIDGET";
export type SnapshotSlot =
  | "HOME"
  | "KEY_SERVICE_1"
  | "KEY_SERVICE_2"
  | "HERO"
  | "SERVICE_SECTION"
  | "CONTACT_BOOKING_SECTION";
export type EditableBlock =
  | "hero"
  | "services"
  | "prices"
  | "team"
  | "reviews"
  | "contacts"
  | "faq"
  | "gallery"
  | "cta";

export interface Reference {
  kind: string;
  ref: string;
  notes?: string;
}

export interface RunRequest {
  requestId: string;
  operatorId: string;
  workMode: WorkMode;
  inputMode: InputMode;
  inputRefs: Reference[];
  executionBoundary: ExecutionBoundary;
  safeLimits?: {
    maxLeads?: number;
    maxBuildableLeads?: number;
    maxPreviewLeads?: number;
    maxPagesPerLead?: number;
  };
  operatorNotes?: string;
  operatorReferences?: Reference[];
  createdAt: string;
}

export interface LeadArtifact {
  leadId: string;
  leadKey: string;
  businessName: string;
  canonicalDomain: string;
  siteUrl?: string;
  hasSite: boolean;
  subdomainDisposition?: "PRIMARY_ENTITY" | "SEPARATE_PRODUCT_OR_BUSINESS";
  source: {
    kind: "scrape" | "manual-list";
    sourceRef?: string;
    importedAt: string;
    rawLabel?: string;
  };
  currentState?: RunState;
  reasonCodes?: ReasonCode[];
  duplicateOfLeadKey?: string;
  notes?: string;
}

export interface SiteSnapshotEntry {
  slot: SnapshotSlot;
  kind: "url" | "virtual-section";
  label: string;
  url?: string;
  sectionId?: string;
  notes?: string;
}

export interface SiteSnapshotArtifact {
  snapshotId: string;
  leadKey: string;
  siteUrl: string;
  capturedAt: string;
  selectionMode: SelectionMode;
  entries: SiteSnapshotEntry[];
  accessBarrier: AccessBarrier;
  retryAttemptCount?: number;
  externalFlow: ExternalFlow;
  accessNotes?: string;
}

export interface ScoreSet {
  redesignValue: number;
  buildFeasibility: number;
  contentSufficiency: number;
  complexity: number;
  confidence: number;
}

export interface QualificationArtifact {
  qualificationId: string;
  leadKey: string;
  snapshotRef?: string;
  qualifiedAt: string;
  selectionMode: SelectionMode;
  inspectedSlots: SnapshotSlot[];
  evidence?: {
    homepageFinding?: string;
    serviceCoverage?: string;
    contentNotes?: string;
    externalFlowNotes?: string;
  };
  blocking: {
    encountered: boolean;
    barrierType: AccessBarrier;
    retryAttempted: boolean;
    retrySucceeded: boolean;
  };
  scores: ScoreSet;
  recommendedDecision: PipelineDecision;
  reasonCodes?: ReasonCode[];
  requiresHumanApproval: boolean;
  humanApprovalTriggers?: ApprovalTrigger[];
  notes?: string;
}

export interface DecisionArtifact {
  decisionId: string;
  leadKey: string;
  decidedAt: string;
  finalDecision: PipelineDecision;
  reasonCodes: ReasonCode[];
  scores: ScoreSet;
  requiresHumanApproval: boolean;
  humanApprovalTriggers?: ApprovalTrigger[];
  approvalStatus: "not-required" | "pending" | "approved" | "rejected";
  preserveExternalFlow?: boolean;
  editableBlocks?: EditableBlock[];
  demoScopeNote?: string;
  notes?: string;
}

export interface RunManifestLeadEntry {
  leadKey: string;
  leadRef?: string;
  currentState: RunState;
  decision?: PipelineDecision;
  qualificationRef?: string;
  decisionRef?: string;
  designSeedRef?: string;
  redesignBriefRef?: string;
  demoBuildPlanRef?: string;
  previewManifestRef?: string;
  reviewDossierRef?: string;
  operatorOverrideRefs?: string[];
  notes?: string;
}

export interface RunManifest {
  runId: string;
  createdAt: string;
  workMode: WorkMode;
  runState: RunState;
  runRequestRef?: string;
  approvalRequestRefs?: string[];
  approvalResponseRefs?: string[];
  operatorAuditLogRef?: string;
  input: {
    kind: InputMode;
    sourceRef?: string;
    requestedLeadCount: number;
  };
  leads: RunManifestLeadEntry[];
  counts: {
    totalLeads: number;
    withSite: number;
    skipped: number;
    auditOnly: number;
    demoFrontOnly: number;
    demoEditableContent: number;
    previewReady: number;
  };
  artifacts?: Array<{
    kind: "qualification-bundle" | "decision-bundle" | "preview-bundle" | "review-dossier";
    uri: string;
    locationKind: "external-artifact" | "external-preview" | "local-doc";
    notes?: string;
  }>;
}

export interface AuditArtifactRef {
  kind: string;
  ref: string;
}

export interface OperatorAuditEvent {
  eventId: string;
  eventType:
    | "RUN_REQUESTED"
    | "RUN_STARTED"
    | "APPROVAL_REQUESTED"
    | "APPROVAL_RESPONDED"
    | "OVERRIDE_APPLIED"
    | "LEAD_RETRIED"
    | "RUN_RESUMED"
    | "RUN_CANCELLED"
    | "NOTE_ADDED";
  timestamp: string;
  actorType: "operator" | "system";
  operatorId?: string;
  leadKey?: string;
  batchId?: string;
  artifactRefs?: AuditArtifactRef[];
  notes?: string;
}

export interface OperatorAuditLog {
  auditLogId: string;
  runId: string;
  events: OperatorAuditEvent[];
  createdAt: string;
  updatedAt: string;
}
