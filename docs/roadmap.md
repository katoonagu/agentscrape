# Roadmap

## Status summary

- Done: Stage `0`, Stage `1`, Stage `2`, Stage `3`, Stage `4`, Stage `5`.
- Current: Stage `6` - operator CLI workflow, approvals, manual overrides and audit trail.
- Next: Stage `7` - hardening and scale-up placeholder.
- Note: Stage `7` остается коротким roadmap placeholder и не детализирует runtime implementation.

## Stages

| Stage | Name | Status | Goal |
| --- | --- | --- | --- |
| 0 | Documentation and contracts baseline | done | Зафиксированы границы v1, сущности, state machine, decision logic, ADR и JSON Schema. |
| 1 | Intake, normalization and qualification | done | Зафиксирован planning baseline для intake, site presence check, dedupe по `LeadKey` и qualification по `home + 2 key service pages`. |
| 2 | Decisioning, approvals and manifests | done | Зафиксированы decision matrix, approval gates, preview/review manifests и canonical contracts. |
| 3 | Preset system + design seed layer | done | Зафиксированы human-editable niche presets, override/resolution rules и contract для resolved design seed. |
| 4 | Demo generation orchestration | done | Зафиксированы generation entry criteria, redesign brief handoff, demo build plan и hard boundaries для demo generation. |
| 5 | Preview deployment and review dossier | done | Зафиксированы preview deployment contract, structured review dossier и run-level artifact linkage без runtime deploy/renderer implementation. |
| 6 | Operator CLI workflow and auditability | current | Формализовать CLI-first operator workflow, structured run requests, approvals, bounded overrides, resume/retry/cancel semantics и canonical operator audit trail. |
| 7 | Hardening and scale-up | todo | TODO: schema evolution, policy hardening, operational safeguards и scale-up без dashboard-first перехода. |

## Stage boundaries

- Stage `0` не включает product/runtime implementation; он завершает planning layer.
- Stage `1` и `2` закрыли intake/qualification baseline, policy layer и manifest contracts без перехода в runtime adapters.
- Stage `3` закрыт как planning/data stage: preset data, inheritance, override logic и design seed contract.
- Stage `4` закрыт как planning/data/contracts stage: generation orchestration, redesign brief и demo build plan без runtime adapters.
- Stage `5` закрыт как planning/data/contracts stage: preview deployment record, review dossier и artifact linkage без deploy adapters, renderer code и generated builds in repo.
- Stage `6` остается planning/data/contracts stage: operator intent, approvals, overrides и audit trail without actual CLI parser, dashboard or worker implementation.
- Stage `7` пока остается placeholder для hardening и scale-up после стабилизации operator control-plane contracts.