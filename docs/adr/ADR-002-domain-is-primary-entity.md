# Title

ADR-002: Domain is the primary entity

## Status

Accepted

## Context

Pipeline ingest'ит leads из scrape и ручных списков, поэтому один и тот же бизнес может приходить многократно, под разными URL и под разными subdomain variants. Без единого primary key нельзя сделать надежный dedupe, невозможно агрегировать qualification history и трудно объяснить, что именно является canonical unit of work.

## Decision

- Primary business tracking unit - `LeadKey = eTLD+1`.
- `LeadKey` считается канонической единицей учета для dedupe и run-level aggregation.
- Субдомены не создают отдельный lead по умолчанию.
- Subdomain становится отдельным lead только если явно представляет отдельный продукт или отдельный бизнес.
- Duplicate records ссылаются на canonical lead через `duplicateOfLeadKey`, а не создают parallel entity tree.

## Consequences

- Dedupe можно делать рано, до qualification и decisioning.
- History и manifests могут ссылаться на стабильный primary key без привязки к source-specific URL variants.
- Implementation обязан иметь явное правило исключений для отдельных product/business subdomains, а не молчаливо считать каждый subdomain новым lead.

## Rejected alternatives

- Использовать full URL как primary entity.
- Считать каждый subdomain отдельным lead по умолчанию.
- Оставить dedupe как purely manual operator step.
