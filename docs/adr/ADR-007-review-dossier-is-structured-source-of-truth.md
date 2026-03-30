# Title

ADR-007: Review dossier is structured source of truth

## Status

Accepted

## Context

После Stage `4` у проекта уже есть generation handoff artifacts, но review layer еще можно было бы описывать как свободный Markdown/PDF narrative. Это создает риск, что итоговый review документ станет зависеть от prompt-only текста, потеряет traceability к upstream artifacts и начнет смешивать recommendations, preview-visible changes и invented claims.

Stage `5` добавляет preview-backed и audit-only review paths, поэтому review layer должен иметь строгий structured source of truth, а human-readable projections должны оставаться derivation layer.

## Decision

- Review dossier хранится как structured artifact.
- Markdown/PDF являются projection layer и не становятся canonical source of truth.
- Review dossier обязан ссылаться на upstream qualification/decision artifacts и, где применимо, на preview artifact.
- Audit-only dossier не может изображать implemented after-state.
- Preview-backed dossier может описывать after-state только там, где есть real preview-backed evidence.

## Consequences

- Review layer становится traceable и совместимой с mixed outcome paths.
- Subsequent renderers и reporting tools смогут строиться поверх stable schema, а не свободного narrative.
- Становится проще контролировать invented claims и boundary drift между audit-only и preview-backed modes.

## Rejected alternatives

- Делать Markdown или PDF canonical review record.
- Хранить review layer только как prose prompt dump.
- Позволить preview-backed и audit-only narratives смешиваться без explicit mode.
- Отложить source-of-truth model до runtime implementation stage.
