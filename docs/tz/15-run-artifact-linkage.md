# 15-run-artifact-linkage

## Purpose

Определить Stage `5` linkage model, в котором `run-manifest` становится canonical orchestration index, а per-lead reference chain делает qualification, decision, generation, preview и review artifacts traceable.

## Approved decisions

- `run-manifest` должен становиться canonical orchestration index.
- Per-lead refs должны покрывать, где применимо:
  - `qualificationRef`
  - `decisionRef`
  - `designSeedRef`
  - `redesignBriefRef`
  - `demoBuildPlanRef`
  - `previewManifestRef`
  - `reviewDossierRef`
- Для `SKIP` часть refs закономерно отсутствует.
- Для `AUDIT_ONLY` нет `previewManifestRef`, но `reviewDossierRef` может существовать.
- Для buildable cases preview и review linkage должны быть traceable.
- Artifact location rules не должны противоречить правилу `generated builds outside repo`.

## Run-manifest role

`run-manifest.schema.json` выполняет роль:

- одного orchestration index на весь CLI run;
- сводной точки входа для mixed-outcome runs;
- container для coarse counts и external artifact references;
- source of traceable per-lead linkage между earlier и later stage artifacts.

`run-manifest` не заменяет сами downstream artifacts и не хранит их payload inline.

## Lead-level reference chain

Нормальная reference chain для buildable case:

`qualificationRef -> decisionRef -> designSeedRef -> redesignBriefRef -> demoBuildPlanRef -> previewManifestRef -> reviewDossierRef`

Для `AUDIT_ONLY` chain короче:

`qualificationRef -> decisionRef -> reviewDossierRef`

Для `SKIP` chain может остановиться рано:

`leadRef -> decisionRef` или даже `leadRef` + notes, если decision stored elsewhere.

## Artifact kinds and location rules

Artifact location rules:

- structured contracts могут ссылаться на local repo-relative refs или внешние URIs, если это planning-safe reference;
- preview artifacts и generated builds всегда outside repo;
- human-readable projections могут жить как local docs или external artifacts, но не становятся source of truth;
- `previewUrl` и `artifactUri` трактуются как references, а не как embedded payload.

## Required vs optional refs

- `qualificationRef` и `decisionRef` ожидаемы для всех non-trivial processed leads.
- `designSeedRef`, `redesignBriefRef` и `demoBuildPlanRef` ожидаемы только для generation-eligible path.
- `previewManifestRef` ожидаем только для preview-backed buildable path.
- `reviewDossierRef` ожидаем для audit-only и preview-backed review path, но может отсутствовать на промежуточных стадиях run.
- Отсутствующий ref должен быть explainable decision path'ом, а не silent gap.

## Mixed-outcome run rules

- Один run может содержать `SKIP`, `AUDIT_ONLY`, `DEMO_FRONT_ONLY` и `DEMO_EDITABLE_CONTENT` leads одновременно.
- `run-manifest` должен поддерживать разные глубины reference chain внутри одного run.
- Counts остаются coarse summary, а не заменой per-lead traceability.
- Mixed-outcome run не должен заставлять все leads иметь одинаковый набор refs.

## Audit-only linkage rules

- `AUDIT_ONLY` lead не получает `previewManifestRef`.
- `AUDIT_ONLY` lead может получить `reviewDossierRef` как final review artifact.
- Audit-only dossier не должен ссылаться на nonexistent buildable artifacts.

## Preview-backed linkage rules

- Buildable preview-backed lead должен иметь traceable refs от decision/generation inputs до preview и review.
- `previewManifestRef` и `reviewDossierRef` должны быть совместимы по `runId`, `leadKey` и decision path.
- Եթե preview еще blocked или failed, linkage может существовать частично, но run-manifest должен это делать понятным через state/notes.

## Edge cases

- Lead canceled or failed after generation handoff: `designSeedRef`, `redesignBriefRef` и `demoBuildPlanRef` могут существовать без `previewManifestRef`.
- Review dossier generated later than preview: `reviewDossierRef` может появиться позже без изменения earlier refs.
- External artifact URIs могут указывать на systems outside repo, но run-manifest должен оставаться provider-neutral.
- Mixed-outcome batch не должен требовать фиктивных refs ради schema completeness.

## Acceptance criteria

- Документ делает `run-manifest` canonical orchestration index.
- Per-lead reference chain перечислен явно и допускает explainable absences.
- Audit-only и preview-backed linkage rules не конфликтуют между собой.
- Artifact location rules совместимы с `generated builds outside repo`.
- Mixed-outcome runs остаются валидным first-class case.

## Out of scope

- Database indexing strategy.
- Runtime artifact storage adapters.
- Operator UI for navigating refs.
- Binary artifact packaging.
