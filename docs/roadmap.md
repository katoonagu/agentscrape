# Roadmap

## Status summary

- Approved: Stage `0`, Stage `1`, Stage `2` как planning scope и набор продуктовых решений.
- Current: Stage `0` - documentation, ADR и manifest contracts.
- Next: Stage `1` - intake, normalization, dedupe и qualification implementation.
- Note: Stage `3+` ниже зафиксированы только как roadmap placeholders/TODO.

## Stages

| Stage | Name | Status | Goal |
| --- | --- | --- | --- |
| 0 | Documentation and contracts baseline | current | Зафиксировать границы v1, сущности, state machine, decision logic, ADR и JSON Schema. |
| 1 | Intake, normalization and qualification | next | Реализовать CLI-first intake, site presence check, dedupe по `LeadKey` и qualification по `home + 2 key service pages`. |
| 2 | Decisioning, approvals and manifests | approved | Реализовать decision matrix, approval gates, preview/review manifests и выходные planning artifacts. |
| 3 | Demo generation orchestration | todo | TODO: подключить generation pipeline только для buildable cases без детальной проработки в текущем stage. |
| 4 | Preview deployment and review dossier | todo | TODO: подключить внешний preview deploy и сбор review dossier без хранения build outputs в repo. |
| 5 | Niche preset authoring | todo | TODO: заполнить preset library для `beauty-salon`, `dental-clinic`, `legal-services` и правила расширения. |
| 6 | Operator ergonomics and auditability | todo | TODO: расширить CLI ergonomics, audit trail и review workflow без dashboard-first подхода. |
| 7 | Hardening and scale-up | todo | TODO: стабилизация, policy hardening, quality controls и operational scale. |

## Stage boundaries

- Stage `0` не включает product/runtime implementation; он завершает planning layer.
- Stage `1` фокусируется на intake, normalization и qualification, но не на полноценной demo generation логике.
- Stage `2` добавляет policy/decision layer и manifests, не превращая систему в dashboard product.
- Stage `3+` требуют отдельной детализации после завершения implementation feedback по Stage `1` и Stage `2`.
