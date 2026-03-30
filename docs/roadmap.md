# Roadmap

## Status summary

- Done: Stage `0`, Stage `1`, Stage `2`.
- Current: Stage `3` - preset system + design seed layer.
- Next: Stage `4` - demo generation orchestration around resolved design direction.
- Note: Stage `4+` ниже зафиксированы как короткие roadmap placeholders и не детализируют runtime implementation.

## Stages

| Stage | Name | Status | Goal |
| --- | --- | --- | --- |
| 0 | Documentation and contracts baseline | done | Зафиксированы границы v1, сущности, state machine, decision logic, ADR и JSON Schema. |
| 1 | Intake, normalization and qualification | done | Зафиксирован planning baseline для intake, site presence check, dedupe по `LeadKey` и qualification по `home + 2 key service pages`. |
| 2 | Decisioning, approvals and manifests | done | Зафиксированы decision matrix, approval gates, preview/review manifests и canonical contracts. |
| 3 | Preset system + design seed layer | current | Формализовать human-editable niche presets, override/resolution rules и contract для resolved design seed. |
| 4 | Demo generation orchestration | next | TODO: подключить generation workflow к resolved design seed и decision outputs без runtime detail overspec. |
| 5 | Preview deployment and review dossier | todo | TODO: уточнить handoff в preview deploy и dossier assembly поверх external artifacts. |
| 6 | Operator ergonomics and auditability | todo | TODO: расширить CLI ergonomics, audit trail и manual override workflow без dashboard-first подхода. |
| 7 | Hardening and scale-up | todo | TODO: policy hardening, quality controls, schema evolution и operational scale-up. |

## Stage boundaries

- Stage `0` не включает product/runtime implementation; он завершает planning layer.
- Stage `1` и `2` уже закрыли intake/qualification baseline, policy layer и manifest contracts без перехода в runtime adapters.
- Stage `3` остается planning/data stage: preset data, inheritance, override logic и design seed contract.
- Stage `4+` требуют отдельной детализации после того, как Stage `3` зафиксирует stable preset/design seed layer.
