# Roadmap

## Status summary

- Done: Stage `0`, Stage `1`, Stage `2`, Stage `3`.
- Current: Stage `4` - demo generation orchestration contracts.
- Next: Stage `5` - preview/review handoff layer.
- Note: Stage `5+` ниже зафиксированы как короткие roadmap placeholders и не детализируют runtime implementation.

## Stages

| Stage | Name | Status | Goal |
| --- | --- | --- | --- |
| 0 | Documentation and contracts baseline | done | Зафиксированы границы v1, сущности, state machine, decision logic, ADR и JSON Schema. |
| 1 | Intake, normalization and qualification | done | Зафиксирован planning baseline для intake, site presence check, dedupe по `LeadKey` и qualification по `home + 2 key service pages`. |
| 2 | Decisioning, approvals and manifests | done | Зафиксированы decision matrix, approval gates, preview/review manifests и canonical contracts. |
| 3 | Preset system + design seed layer | done | Зафиксированы human-editable niche presets, override/resolution rules и contract для resolved design seed. |
| 4 | Demo generation orchestration | current | Формализовать generation entry criteria, redesign brief handoff, demo build plan и hard boundaries для demo generation. |
| 5 | Preview deployment and review dossier | todo | TODO: уточнить handoff из build outputs в preview deploy и dossier assembly поверх external artifacts. |
| 6 | Operator ergonomics and auditability | todo | TODO: расширить CLI ergonomics, audit trail, manual overrides и reviewability без dashboard-first подхода. |
| 7 | Hardening and scale-up | todo | TODO: policy hardening, schema evolution, quality controls и operational scale-up. |

## Stage boundaries

- Stage `0` не включает product/runtime implementation; он завершает planning layer.
- Stage `1` и `2` закрыли intake/qualification baseline, policy layer и manifest contracts без перехода в runtime adapters.
- Stage `3` закрыт как planning/data stage: preset data, inheritance, override logic и design seed contract.
- Stage `4` остается planning/data/contracts stage: generation orchestration, redesign brief и demo build plan без runtime adapters.
- Stage `5+` требуют отдельной детализации после того, как Stage `4` зафиксирует stable generation handoff layer.
