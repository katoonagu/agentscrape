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
export type DesignSeedConfidence = "high" | "medium" | "low";
export type AppliedLayer =
  | "global-defaults"
  | "niche-preset"
  | "existing-brand"
  | "lead-override"
  | "operator-override";
export type ExternalFlowMode =
  | "not-applicable"
  | "preserved-integration-point"
  | "preserved-booking-surface"
  | "preserved-cta-path";
export type BriefPagePlanType = "multi-page-limited" | "single-page-sections";
export type BriefPageType = "home" | "key-service" | "contact-booking" | "single-page";
export type BuildGenerationMode = "front-only" | "limited-editable-content";
export type PreviewStatus = "requested" | "building" | "ready" | "failed" | "blocked";
export type PreviewDeploymentKind = "external-preview-deployment" | "external-artifact";
export type ContentSourceType =
  | "verified-current-site"
  | "qualification-finding"
  | "preset-direction"
  | "operator-approved-note"
  | "placeholder-assumption";
export type PlaceholderGapType =
  | "copy-gap"
  | "price-gap"
  | "staff-gap"
  | "social-proof-gap"
  | "regulatory-gap"
  | "image-gap"
  | "service-detail-gap"
  | "other";
export type BuildStopReason =
  | "MISSING_GENERATION_ELIGIBILITY"
  | "MISSING_REQUIRED_INPUT"
  | "EDITABLE_SCOPE_EXCEEDED"
  | "EXTERNAL_FLOW_AMBIGUOUS"
  | "PAGE_SCOPE_NOT_DEFENSIBLE"
  | "CONTENT_GAP_MATERIAL"
  | "LOW_SEED_CONFIDENCE"
  | "DIRECTION_CONFLICT_WITH_SITE_REALITY"
  | "COMPLEXITY_BORDERLINE";
export type PreviewBlocker =
  | "APPROVAL_PENDING"
  | "MISSING_REDESIGN_BRIEF"
  | "MISSING_DEMO_BUILD_PLAN"
  | "GENERATION_BOUNDARY_VIOLATION"
  | "PREVIEW_BUILD_FAILED";

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

export interface DesignSeedArtifact {
  seedId: string;
  leadKey: string;
  primaryPresetId: string;
  seedConfidence: DesignSeedConfidence;
  sourceSummary: {
    appliedLayers: AppliedLayer[];
    brandCluesStrength: "weak" | "medium" | "strong";
    operatorReferencesUsed: boolean;
    notes?: string[];
  };
  tasteProfile: {
    designVariance: number;
    motionIntensity: number;
    visualDensity: number;
  };
  copyProfile: {
    tone: string;
    ctaBias: string;
    trustEmphasis: string;
    headlineStyle: string;
  };
  layoutProfile: {
    requiredSections: string[];
    optionalSections: string[];
    orderingBias: string[];
  };
  visualDirection: string[];
  paletteDirection: string[];
  typographyDirection: string[];
  imageryDirection: string[];
  preservedConstraints: string[];
  editableScope: EditableBlock[];
  riskFlags: string[];
  requiresHumanApproval: boolean;
  assumptions?: string[];
}

export interface RedesignBriefArtifact {
  briefId: string;
  leadKey: string;
  decisionType: Extract<PipelineDecision, "DEMO_FRONT_ONLY" | "DEMO_EDITABLE_CONTENT">;
  designSeedRef: string;
  problemSummary: string;
  redesignGoals: string[];
  preservedConstraints: string[];
  externalFlowHandling: {
    mode: ExternalFlowMode;
    notes: string;
  };
  editableScope: EditableBlock[];
  pagePlanSummary: {
    planType: BriefPagePlanType;
    plannedPages: Array<{
      pageKey: string;
      pageType: BriefPageType;
      required: boolean;
    }>;
    rationale: string;
  };
  sectionPlan: Array<{
    scopeRef: string;
    sections: string[];
    notes?: string;
  }>;
  copyDirection: string[];
  visualDirection: string[];
  nonGoals: string[];
  assumptions?: string[];
  approvalRequired: boolean;
}

export interface DemoBuildPlanArtifact {
  buildPlanId: string;
  leadKey: string;
  decisionType: Extract<PipelineDecision, "DEMO_FRONT_ONLY" | "DEMO_EDITABLE_CONTENT">;
  generationMode: BuildGenerationMode;
  designSeedRef: string;
  redesignBriefRef: string;
  pagePlan: {
    planType: BriefPagePlanType;
    pages: Array<{
      pageKey: string;
      pageType: BriefPageType;
      sourceBasis: string;
      required: boolean;
    }>;
    rationale?: string;
  };
  sectionPlan: Array<{
    pageKey: string;
    sections: string[];
    editableBlocks?: EditableBlock[];
    notes?: string;
  }>;
  contentSources: Array<{
    scopeRef: string;
    sourceType: ContentSourceType;
    notes: string;
  }>;
  editableScope: EditableBlock[];
  externalFlowHandling: {
    mode: ExternalFlowMode;
    notes: string;
  };
  placeholders?: Array<{
    scopeRef: string;
    gapType: PlaceholderGapType;
    notes: string;
    approvalRequired: boolean;
  }>;
  approvalRequired: boolean;
  generationReady: boolean;
  stopReasons: BuildStopReason[];
  assumptions?: string[];
}

export interface PreviewManifestArtifact {
  previewId: string;
  runId: string;
  leadKey: string;
  decision: Extract<PipelineDecision, "DEMO_FRONT_ONLY" | "DEMO_EDITABLE_CONTENT">;
  decisionRef: string;
  designSeedRef: string;
  redesignBriefRef: string;
  demoBuildPlanRef: string;
  provider: string;
  status: PreviewStatus;
  deploymentKind: PreviewDeploymentKind;
  previewUrl?: string;
  artifactUri?: string;
  generatedAt: string;
  buildStoredInRepo: false;
  externalFlowHandling: {
    mode: ExternalFlowMode;
    notes: string;
  };
  blockers?: PreviewBlocker[];
  notes?: string;
}

export interface NichePreset {
  id: string;
  label: string;
  version: string;
  status: "draft" | "active" | "deprecated";
  applicability: {
    positive_signals: string[];
    negative_signals: string[];
    typical_offers: string[];
    site_clues: string[];
  };
  taste: {
    design_variance: number;
    motion_intensity: number;
    visual_density: number;
  };
  copy: {
    tone: string;
    cta_bias: string;
    trust_emphasis: string;
    headline_style: string;
  };
  layout: {
    required_sections: string[];
    optional_sections: string[];
    ordering_bias: string[];
  };
  qualification: {
    complexity_bias: string;
    editable_content_default: "discourage" | "allow-if-qualified" | "prefer-when-qualified";
    external_flow_policy:
      | "preserve-front-layer"
      | "preserve-and-require-approval"
      | "preserve-and-bias-front-only";
  };
  editingScope: {
    allowed_editable_blocks: EditableBlock[];
  };
  designSeed: {
    visual_direction: string[];
    palette_direction: string[];
    typography_direction: string[];
    imagery_direction: string[];
  };
  approvalHints: {
    manual_review_required_when: string[];
    do_not_auto_apply_when: string[];
  };
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
