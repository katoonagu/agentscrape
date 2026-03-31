# Roadmap

## Status summary

- Done: Stage `0`, Stage `1`, Stage `2`, Stage `3`, Stage `4`, Stage `5`, Stage `6`.
- Current: Stage `7` - first-party skills source layer.
- Next: Stage `8` - hardening and install operationalization placeholder.
- Note: Stage `8` остается коротким roadmap placeholder и не детализирует runtime implementation.

## Stages

| Stage | Name | Status | Goal |
| --- | --- | --- | --- |
| 0 | Documentation and contracts baseline | done | Зафиксированы границы v1, сущности, state machine, decision logic, ADR и JSON Schema. |
| 1 | Intake, normalization and qualification | done | Зафиксирован planning baseline для intake, site presence check, dedupe по `LeadKey` и qualification по `home + 2 key service pages`. |
| 2 | Decisioning, approvals and manifests | done | Зафиксированы decision matrix, approval gates, preview/review manifests и canonical contracts. |
| 3 | Preset system + design seed layer | done | Зафиксированы human-editable niche presets, override/resolution rules и contract для resolved design seed. |
| 4 | Demo generation orchestration | done | Зафиксированы generation entry criteria, redesign brief handoff, demo build plan и hard boundaries для demo generation. |
| 5 | Preview deployment and review dossier | done | Зафиксированы preview deployment contract, structured review dossier и run-level artifact linkage без runtime deploy/renderer implementation. |
| 6 | Operator CLI workflow and auditability | done | Формализованы CLI-first operator workflow, structured run requests, approvals, bounded overrides, resume/retry/cancel semantics и canonical operator audit trail. |
| 7 | First-party skills source layer | current | Оформить authored internal skills, skill strategy, skill interaction model, source/install layout и skill registry как source-controlled project layer поверх contracts. |
| 8 | Hardening and install operationalization | todo | TODO: install/sync discipline, validation hardening и operational safeguards без перехода в runtime product implementation. |

## Stage boundaries

- Stage `0` не включает product/runtime implementation; он завершает planning layer.
- Stage `1` и `2` закрыли intake/qualification baseline, policy layer и manifest contracts без перехода в runtime adapters.
- Stage `3` закрыт как planning/data stage: preset data, inheritance, override logic и design seed contract.
- Stage `4` закрыт как planning/data/contracts stage: generation orchestration, redesign brief и demo build plan без runtime adapters.
- Stage `5` закрыт как planning/data/contracts stage: preview deployment record, review dossier и artifact linkage без deploy adapters, renderer code и generated builds in repo.
- Stage `6` закрыт как planning/data/contracts stage: operator intent, approvals, overrides и audit trail without actual CLI parser, dashboard or worker implementation.
- Stage `7` остается source-authoring / planning stage: repo-authoring для first-party skills, support registry и project-specific guidance layer без runtime install copies в качестве source of truth.
- Stage `8` пока остается placeholder для hardening и install operationalization после стабилизации authored skill layer.
