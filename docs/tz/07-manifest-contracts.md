# 07-manifest-contracts

## Purpose

Определить contracts для planning/manifests/control-plane слоя, чтобы subsequent implementation использовал стабильные JSON payloads для lead intake, qualification output, decision output, design seed resolution, generation handoff, preview deployment record, review dossier, operator-side control artifacts и support registry для authored internal skills.

## Approved decisions

- Канонические schema files:
  - `packages/schemas/lead.schema.json`
  - `packages/schemas/site-snapshot.schema.json`
  - `packages/schemas/qualification.schema.json`
  - `packages/schemas/decision.schema.json`
  - `packages/schemas/run-manifest.schema.json`
  - `packages/schemas/preview-manifest.schema.json`
  - `packages/schemas/design-seed.schema.json`
  - `packages/schemas/redesign-brief.schema.json`
  - `packages/schemas/demo-build-plan.schema.json`
  - `packages/schemas/review-dossier.schema.json`
  - `packages/schemas/run-request.schema.json`
  - `packages/schemas/approval-request.schema.json`
  - `packages/schemas/approval-response.schema.json`
  - `packages/schemas/operator-override.schema.json`
  - `packages/schemas/operator-audit-log.schema.json`
  - `packages/schemas/skill-registry.schema.json`
- Все schema files используют JSON Schema draft-07.
- Schemas описывают planning/manifests/control-plane слой, а не runtime implementation internals.
- `skill-registry.schema.json` является support schema для authored internal skills и не становится core business artifact.
- Required fields должны быть только там, где без них contract теряет смысл.
- Generation-, preview-, review-, operator-facing и skill-registry contracts остаются planning/data artifacts и не превращаются в runtime engine config, worker payloads, CLI parser internals, provider-specific deployment internals или renderer layout specs.
- Structured review dossier остается source of truth для review layer.
- Structured operator artifacts остаются source of truth для operator intent, approvals, overrides и auditability; freeform CLI text и templates допустимы только как projection / transport layer.
- Internal skills являются assistive layer поверх contracts/docs/schemas и не заменяют source-of-truth artifacts.

## Rules / logic

### `lead.schema.json`

- Описывает нормализованный lead record.
- Должен покрывать:
  - lead identity;
  - source metadata;
  - canonical domain / `LeadKey`;
  - site presence;
  - dedupe pointer;
  - optional site URL.

### `site-snapshot.schema.json`

- Описывает qualification surface, а не полный crawl.
- Должен покрывать:
  - selected pages/sections;
  - snapshot metadata;
  - access barrier indicators;
  - external flow flags.

### `qualification.schema.json`

- Описывает rubric result.
- Должен покрывать:
  - selected scope;
  - evidence notes;
  - `ScoreSet`;
  - blocker/retry result;
  - recommended decision;
  - mandatory approval signal.

### `decision.schema.json`

- Описывает финальное pipeline decision.
- Должен покрывать:
  - `PipelineDecision`;
  - `ReasonCode[]`;
  - approval requirement/status;
  - demo scope boundary;
  - editable blocks only when разрешен `DEMO_EDITABLE_CONTENT`.

### `design-seed.schema.json`

- Описывает structured form resolved design seed из Stage `3`.
- Должен покрывать:
  - resolved preset identity;
  - source summary и applied layers;
  - taste/copy/layout profiles;
  - direction arrays для visual, palette, typography и imagery;
  - preserved constraints;
  - editable scope boundary;
  - risk flags и approval requirement.

### `redesign-brief.schema.json`

- Описывает handoff artifact между planning layer и generation phase.
- Должен покрывать:
  - generation-eligible decision type;
  - design seed reference;
  - problem summary и redesign goals;
  - preserved constraints и external flow handling;
  - page plan summary и section plan;
  - copy / visual direction;
  - non-goals и assumptions.

### `demo-build-plan.schema.json`

- Описывает machine-readable minimal scope для generation phase.
- Должен покрывать:
  - generation mode;
  - page plan и section plan;
  - content source mapping;
  - editable scope;
  - preserved external flow handling;
  - placeholders, approval requirement и readiness state.

### `preview-manifest.schema.json`

- Описывает provider-neutral внешний preview deployment или artifact reference.
- Не должен содержать generated code, in-repo build paths или low-level deployment internals.
- Должен покрывать:
  - preview identity;
  - owning run/lead;
  - allowed preview-capable decision;
  - upstream generation refs;
  - coarse provider/status;
  - external URL / artifact URI;
  - preserved external flow handling;
  - explicit `buildStoredInRepo = false`.

### `review-dossier.schema.json`

- Описывает structured review dossier как canonical source of truth для review layer.
- Должен покрывать:
  - dossier mode;
  - qualification / decision linkage;
  - optional preview linkage;
  - summary of weaknesses and changes;
  - preserved constraints и external flow handling;
  - evidence-backed findings;
  - assumptions и non-goals.

### `run-request.schema.json`

- Описывает canonical operator intent после нормализации CLI input.
- Должен покрывать:
  - work mode;
  - input mode и input refs;
  - execution boundary / stop-after intent;
  - safe limits;
  - operator notes и references;
  - author / timestamp.

### `approval-request.schema.json`

- Описывает structured approval batch или lead-level gate.
- Должен покрывать:
  - run / batch identity;
  - gate type и work mode;
  - items requiring review;
  - approval reasons;
  - summary и source refs;
  - lifecycle status.

### `approval-response.schema.json`

- Описывает structured human response на approval gate.
- Должен покрывать:
  - approval request linkage;
  - run / batch linkage;
  - operator identity;
  - per-lead verdicts;
  - resulting decisions where applicable;
  - notes / timestamp.

### `operator-override.schema.json`

- Описывает bounded manual override как отдельный control artifact.
- Должен покрывать:
  - run / optional lead linkage;
  - scope и target artifact kind;
  - override taxonomy;
  - payload;
  - rationale;
  - reevaluation requirement;
  - author / source linkage.

### `operator-audit-log.schema.json`

- Описывает canonical operator/system interaction trail.
- Должен покрывать:
  - run identity;
  - ordered events;
  - actor type;
  - optional lead / batch / artifact refs;
  - timestamps;
  - notes.

### `run-manifest.schema.json`

- Описывает один CLI run как canonical orchestration index.
- Должен покрывать:
  - run metadata;
  - `WorkMode`;
  - `RunState`;
  - canonical run request ref;
  - approval, override и audit refs;
  - per-lead refs across qualification, decision, generation, preview и review artifacts;
  - counts;
  - external artifact refs.

### `skill-registry.schema.json`

- Описывает authored internal skill inventory.
- Должен покрывать:
  - authored skill identity;
  - repo source path;
  - lifecycle status;
  - purpose и triggers;
  - upstream / downstream artifact touchpoints;
  - explicit boundaries и notes.
- Не должен описывать runtime install paths, plugin-manager behavior или execution state.

### Examples

- Example files рядом со schemas должны быть реалистичными и парситься against their schemas.
- Examples не должны содержать production secrets, токены или реальные credentials.
- Examples для preview, review, operator layer и skill registry должны показывать traceable linkage и не притворяться runtime implementation details.

## Edge cases

- `Lead` без сайта может быть валиден без `siteUrl`, но должен явно отражать отсутствие сайта.
- `PreviewManifest` недопустим для `SKIP` и `AUDIT_ONLY`.
- `ReviewDossier` допустим для `AUDIT_ONLY` даже без `previewManifestRef`.
- `RunRequest` может существовать независимо от raw CLI text и оставаться canonical operator intent.
- `ApprovalRequest` transport batch не превращается в один общий verdict для всех leads.
- `OperatorOverride` не должен кодировать unrestricted superuser bypass.
- `RunManifest` может ссылаться на mixed outcomes within one run.
- `RedesignBrief` и `DemoBuildPlan` недопустимы для `SKIP` и `AUDIT_ONLY`.
- `ReviewDossier` не должен кодировать PDF layout, markdown rendering rules или invented after-state facts.
- Installed runtime copies skills могут жить вне repo и path-wise не совпадать с authored source files; source of truth для authored skill inventory остается repo registry.

## Acceptance criteria

- Все schema files существуют и содержат согласованные enum'ы.
- Examples structurally match their schemas.
- `ReasonCode`, `PipelineDecision`, `WorkMode` и pipeline states не расходятся между docs и schemas.
- Preview/review/operator contracts явно отделены от runtime implementation.
- В contracts отсутствуют storage/build details, противоречащие Stage `0..7`.
- Из документа явно видно, что internal skills и support registry не подменяют core business artifacts как source of truth.

## Out of scope

- Database migrations и storage adapters.
- Queue payloads, worker events и telemetry envelopes.
- Runtime prompt assembly, codegen config и provider-specific generation/deploy settings.
- CLI parser implementation, terminal UX rendering и notification integrations.
- PDF renderer, markdown renderer и binary artifact generation.
- Runtime skill installer, skill sync automation и install-path operationalization.
