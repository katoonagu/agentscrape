# 07-manifest-contracts

## Purpose

Определить contracts для planning/manifests/control-plane слоя, чтобы subsequent implementation и repo-wide verification использовали стабильные JSON payloads для lead intake, qualification output, decision output, design seed resolution, generation handoff, preview deployment record, review dossier, operator-side control artifacts и support/control artifacts для hardening и install operationalization.

## Approved decisions

- Канонические schema files делятся на три семейства.
- Core business artifacts:
  - `packages/schemas/lead.schema.json`
  - `packages/schemas/site-snapshot.schema.json`
  - `packages/schemas/qualification.schema.json`
  - `packages/schemas/decision.schema.json`
  - `packages/schemas/design-seed.schema.json`
  - `packages/schemas/redesign-brief.schema.json`
  - `packages/schemas/demo-build-plan.schema.json`
  - `packages/schemas/preview-manifest.schema.json`
  - `packages/schemas/review-dossier.schema.json`
  - `packages/schemas/run-manifest.schema.json`
- Operator/control artifacts:
  - `packages/schemas/run-request.schema.json`
  - `packages/schemas/approval-request.schema.json`
  - `packages/schemas/approval-response.schema.json`
  - `packages/schemas/operator-override.schema.json`
  - `packages/schemas/operator-audit-log.schema.json`
- Support/control artifacts:
  - `packages/schemas/skill-registry.schema.json`
  - `packages/schemas/validation-report.schema.json`
  - `packages/schemas/acceptance-checklist.schema.json`
  - `packages/schemas/skill-install-plan.schema.json`
- Все schema files используют JSON Schema draft-07.
- Schemas описывают planning/manifests/control-plane слой, а не runtime implementation internals.
- Support/control artifacts не являются business artifacts и не могут silently менять approved business rules.
- Required fields должны быть только там, где без них contract теряет смысл.
- Generation-, preview-, review-, operator-facing и support/control contracts остаются planning/data artifacts и не превращаются в runtime engine config, worker payloads, CLI parser internals, provider-specific deployment internals, CI config или renderer layout specs.
- Structured review dossier остается source of truth для review layer.
- Structured operator artifacts остаются source of truth для operator intent, approvals, overrides и auditability; freeform CLI text и templates допустимы только как projection / transport layer.
- Internal skills являются assistive layer поверх contracts/docs/schemas и не заменяют source-of-truth artifacts.

## Rules / logic

### Artifact families

- Core business artifacts описывают business path от intake до preview/review.
- Operator/control artifacts описывают operator intent, approval path, overrides и audit trail.
- Support/control artifacts описывают readiness, validation, skill source inventory и install operationalization.
- Projection templates и authored skills не входят в source-of-truth family сами по себе и должны оставаться совместимыми с canonical structured contracts.

### Core business artifacts

- `lead.schema.json` описывает нормализованный lead record.
- `site-snapshot.schema.json` описывает qualification surface, а не полный crawl.
- `qualification.schema.json` описывает rubric result и `ScoreSet`.
- `decision.schema.json` описывает финальное pipeline decision и demo boundary.
- `design-seed.schema.json` описывает structured form resolved design seed.
- `redesign-brief.schema.json` описывает handoff artifact между planning layer и generation phase.
- `demo-build-plan.schema.json` описывает machine-readable minimal scope для generation phase.
- `preview-manifest.schema.json` описывает provider-neutral внешний preview deployment или artifact reference и не содержит generated code.
- `review-dossier.schema.json` описывает structured review dossier как canonical source of truth для review layer.
- `run-manifest.schema.json` описывает один CLI run как canonical orchestration index.

### Operator/control artifacts

- `run-request.schema.json` описывает canonical operator intent после нормализации CLI input.
- `approval-request.schema.json` описывает structured approval batch или lead-level gate.
- `approval-response.schema.json` описывает structured human response на approval gate.
- `operator-override.schema.json` описывает bounded manual override как отдельный control artifact.
- `operator-audit-log.schema.json` описывает canonical operator/system interaction trail.

### Support/control artifacts

- `skill-registry.schema.json` описывает authored internal skill inventory и repo source paths.
- `validation-report.schema.json` описывает structured validation outcome для repo-wide hardening и readiness review.
- `acceptance-checklist.schema.json` описывает финальный planning-phase exit checklist.
- `skill-install-plan.schema.json` описывает intended install/sync operationalization для authored internal skills.
- Support/control artifacts не должны:
  - переопределять decision policy;
  - расширять editable scope;
  - менять preserved external flow semantics;
  - подменять business artifacts или operator/control artifacts.

### Examples

- Example files рядом со schemas должны быть реалистичными и парситься against their schemas.
- Examples не должны содержать production secrets, токены или реальные credentials.
- Examples для preview, review, operator layer, skill registry, validation и install operationalization должны показывать traceable linkage и не притворяться runtime implementation details.

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
- Validation/install artifacts могут указывать на warnings и drift, но не должны masquerade as runtime state dump.

## Acceptance criteria

- Все schema files существуют и содержат согласованные enum'ы.
- Examples structurally match their schemas.
- `ReasonCode`, `PipelineDecision`, `WorkMode` и pipeline states не расходятся между docs и schemas.
- Preview/review/operator/support contracts явно отделены от runtime implementation.
- В contracts отсутствуют storage/build details, противоречащие Stage `0..8`.
- Из документа явно видно, что internal skills, support schemas и templates не подменяют core business artifacts как source of truth.

## Out of scope

- Database migrations и storage adapters.
- Queue payloads, worker events и telemetry envelopes.
- Runtime prompt assembly, codegen config и provider-specific generation/deploy settings.
- CLI parser implementation, terminal UX rendering и notification integrations.
- PDF renderer, markdown renderer и binary artifact generation.
- Runtime skill installer, CI/CD orchestration и install-path operationalization scripts.
