# 15-run-artifact-linkage

## Purpose

Определить linkage model, в котором `run-manifest` становится canonical orchestration index, а per-run и per-lead reference chain делает qualification, decision, generation, preview, review и operator-side artifacts traceable.

## Approved decisions

- `run-manifest` должен становиться canonical orchestration index.
- Top-level refs должны покрывать, где применимо:
  - `runRequestRef`
  - `approvalRequestRefs`
  - `approvalResponseRefs`
  - `operatorAuditLogRef`
- Per-lead refs должны покрывать, где применимо:
  - `qualificationRef`
  - `decisionRef`
  - `designSeedRef`
  - `redesignBriefRef`
  - `demoBuildPlanRef`
  - `previewManifestRef`
  - `reviewDossierRef`
  - `operatorOverrideRefs`
- Для `SKIP` часть refs закономерно отсутствует.
- Для `AUDIT_ONLY` нет `previewManifestRef`, но `reviewDossierRef` может существовать.
- Для buildable cases preview и review linkage должны быть traceable.
- Artifact location rules не должны противоречить правилу `generated builds outside repo`.

## Run-manifest role

`run-manifest.schema.json` выполняет роль:

- одного orchestration index на весь CLI run;
- сводной точки входа для mixed-outcome runs;
- canonical index для operator-side control artifacts;
- source of traceable linkage между earlier и later stage artifacts.

`run-manifest` не заменяет сами downstream artifacts и не хранит их payload inline.

## Lead-level reference chain

Нормальная reference chain для buildable case:

`qualificationRef -> decisionRef -> designSeedRef -> redesignBriefRef -> demoBuildPlanRef -> previewManifestRef -> reviewDossierRef`

Operator-side lead-specific additions могут дополнять эту цепочку через:

`operatorOverrideRefs`

Для `AUDIT_ONLY` chain короче:

`qualificationRef -> decisionRef -> reviewDossierRef`

Для `SKIP` chain может остановиться рано:

`leadRef -> decisionRef` или даже `leadRef` + notes, если decision stored elsewhere.

## Artifact kinds and location rules

Artifact location rules:

- structured contracts могут ссылаться на local repo-relative refs или внешние URIs, если это planning-safe reference;
- preview artifacts и generated builds всегда outside repo;
- human-readable projections могут жить как local docs или external artifacts, но не становятся source of truth;
- `previewUrl` и `artifactUri` трактуются как references, а не как embedded payload;
- operator-side artifacts остаются control-plane records и не подменяют downstream manifests.

## Required vs optional refs

- `runRequestRef` ожидаем для normal operator-started run.
- `approvalRequestRefs` и `approvalResponseRefs` ожидаемы только там, где approval path реально был задействован.
- `operatorAuditLogRef` ожидаем для auditable operator-managed run.
- `qualificationRef` и `decisionRef` ожидаемы для всех non-trivial processed leads.
- `designSeedRef`, `redesignBriefRef` и `demoBuildPlanRef` ожидаемы только для generation-eligible path.
- `previewManifestRef` ожидаем только для preview-backed buildable path.
- `reviewDossierRef` ожидаем для audit-only и preview-backed review path, но может отсутствовать на промежуточных стадиях run.
- `operatorOverrideRefs` ожидаемы только для leads, где override реально применялся.
- Отсутствующий ref должен быть explainable decision path'ом, а не silent gap.

## Mixed-outcome run rules

- Один run может содержать `SKIP`, `AUDIT_ONLY`, `DEMO_FRONT_ONLY` и `DEMO_EDITABLE_CONTENT` leads одновременно.
- `run-manifest` должен поддерживать разные глубины reference chain внутри одного run.
- Counts остаются coarse summary, а не заменой per-lead traceability.
- Mixed-outcome run не должен заставлять все leads иметь одинаковый набор refs.
- Operator-side artifacts не должны forcing uniform override or approval linkage for every lead.

## Audit-only linkage rules

- `AUDIT_ONLY` lead не получает `previewManifestRef`.
- `AUDIT_ONLY` lead может получить `reviewDossierRef` как final review artifact.
- Audit-only dossier не должен ссылаться на nonexistent buildable artifacts.
- Approval artifacts могут существовать для borderline audit-only decision, но это не делает preview path valid.

## Preview-backed linkage rules

- Buildable preview-backed lead должен иметь traceable refs от decision/generation inputs до preview и review.
- `previewManifestRef` и `reviewDossierRef` должны быть совместимы по `runId`, `leadKey` и decision path.
- Если preview еще blocked или failed, linkage может существовать частично, но run-manifest должен это делать понятным через state/notes.

## Operator-side linkage rules

- `runRequestRef` описывает canonical operator intent на уровень run.
- `approvalRequestRefs` и `approvalResponseRefs` описывают batch-scoped или gate-scoped control path, не заменяя lead-level refs.
- `operatorOverrideRefs` остаются per-lead by default, потому что override чаще всего влияет на конкретный artifact boundary или конкретный lead.
- `operatorAuditLogRef` связывает run-level control plane interaction layer, но не подменяет manifests, decisions или review artifacts.
- Retry, resume и cancel должны быть traceable через audit log и не должны silently удалять существующие refs.

## Edge cases

- Lead cancelled or failed after generation handoff: `designSeedRef`, `redesignBriefRef` и `demoBuildPlanRef` могут существовать без `previewManifestRef`.
- Review dossier generated later than preview: `reviewDossierRef` может появиться позже без изменения earlier refs.
- External artifact URIs могут указывать на systems outside repo, но run-manifest должен оставаться provider-neutral.
- Mixed-outcome batch не должен требовать фиктивных refs ради schema completeness.
- Batch-level approval refs могут быть top-level only, even if only subset of leads required response.

## Acceptance criteria

- Документ делает `run-manifest` canonical orchestration index.
- Per-run и per-lead reference chains перечислены явно и допускают explainable absences.
- Audit-only, preview-backed и operator-side linkage rules не конфликтуют между собой.
- Artifact location rules совместимы с `generated builds outside repo`.
- Mixed-outcome runs остаются валидным first-class case.

## Out of scope

- Database indexing strategy.
- Runtime artifact storage adapters.
- Actual CLI navigation UX for refs.
- Binary artifact packaging.