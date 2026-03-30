# Design Brief Template Layer

Эта папка хранит human-readable projection для redesign brief handoff artifacts Stage `4`.

## Purpose

- дать короткий Markdown template для downstream use;
- отразить contract из `docs/tz/11-redesign-brief-contract.md` без runtime-specific деталей;
- сохранить согласованность между structured brief и human-readable handoff.

## Mapping

- `Lead / decision context` -> `briefId`, `leadKey`, `decisionType`, `designSeedRef`, `approvalRequired`
- `Problem summary` -> `problemSummary`
- `Redesign goals` -> `redesignGoals`
- `Preserved constraints` -> `preservedConstraints`
- `External flow handling` -> `externalFlowHandling`
- `Editable scope` -> `editableScope`
- `Page plan` -> `pagePlanSummary`
- `Section plan` -> `sectionPlan`
- `Copy direction` -> `copyDirection`
- `Visual direction` -> `visualDirection`
- `Non-goals` -> `nonGoals`
- `Assumptions` -> `assumptions`

## Rules

- Markdown template не является source of truth; canonical form - `redesign-brief.schema.json`.
- Template не должен добавлять новые product decisions, которые не отражены в structured brief.
- Template не является runtime prompt dump, кодом или production design system.
