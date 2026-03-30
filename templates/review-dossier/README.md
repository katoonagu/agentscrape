# Review Dossier Template Layer

Эта папка хранит human-readable projection для structured review dossier artifacts Stage `5`.

## Purpose

- дать короткий Markdown template для downstream review use;
- отразить contract из `docs/tz/14-review-dossier-contract.md` без превращения template в PDF layout;
- сохранить согласованность между structured dossier и human-readable review projection.

## Mapping

- `Lead / decision context` -> `runId`, `leadKey`, `dossierMode`, `decisionType`, `previewManifestRef`
- `Problem summary` -> `summary.problemSummary`
- `What was weak before` -> `summary.beforeWeaknesses`
- `What changed or is recommended to change` -> `summary.changeSummary`
- `Preserved constraints` -> `preservedConstraints`
- `External flow handling` -> `externalFlowHandling`
- `Editable scope` -> `editableScope`
- `Findings / evidence` -> `findings`
- `Non-goals` -> `nonGoals`
- `Assumptions` -> `assumptions`

## Rules

- Markdown template не является source of truth; canonical form - `review-dossier.schema.json`.
- Template не должен добавлять новые product decisions, которых нет в structured dossier.
- Template не имитирует PDF layout и не превращается в marketing brochure.
