# 14-review-dossier-contract

## Purpose

Определить structured review dossier как canonical artifact review layer, который связывает qualification, decision, preview evidence и final review narrative без зависимости от свободного prompt-only текста.

## Approved decisions

- Review dossier - structured source of truth.
- Markdown/PDF - projection layer, не канонический источник.
- Dossier modes:
  - `audit-only`
  - `preview-backed-demo`
- `audit-only` dossier допустим без `previewManifestRef`.
- `preview-backed-demo` dossier должен ссылаться на preview artifact и, где применимо, показывать before/after evidence.
- Если case `AUDIT_ONLY`, dossier не должен притворяться, что after-state реально построен.
- Нельзя выдавать invented improvements как implemented facts, если preview не существует.

## Dossier modes

### `audit-only`

- Используется для `AUDIT_ONLY` cases.
- Может существовать без preview manifest.
- Фокусируется на structured audit findings, weakness summary и recommended changes.
- Не описывает changes как implemented facts.

### `preview-backed-demo`

- Используется для buildable demo cases, где preview artifact существует.
- Должен ссылаться на `previewManifestRef`.
- Может описывать implemented or preview-visible changes только там, где они реально evidence-backed.
- Не должен расширять decision boundary или делать claims beyond preview-visible state.

## Source of truth model

- `review-dossier.schema.json` - canonical structured dossier.
- Markdown/PDF projections выводятся из structured dossier и не добавляют новые product decisions.
- Если projection layer расходится со structured dossier, structured dossier имеет приоритет.
- Free-form narrative может существовать только как projection, а не как canonical review record.

## Required sections

Dossier должен уметь отражать:

- `problem summary`;
- `what was weak before`;
- `what changed or recommended to change`;
- `preserved constraints`;
- `external flow handling`;
- `editable scope`;
- `assumptions`;
- `non-goals`.

## Evidence model

Evidence model должен поддерживать:

- before evidence refs;
- after evidence refs;
- captions / notes;
- optional issue/block scope labels.

Evidence refs могут быть:

- external screenshot refs;
- external image refs;
- document refs.

Evidence record не должен притворяться binary payload inside repo; он хранит references и explanatory captions.

## Before/after comparison rules

- `before-only` findings допустимы для audit-only mode и для unresolved issues.
- `before-after` findings допустимы, когда after-state реально существует и traceable.
- After evidence не должно описывать невидимые или непостроенные changes.
- Comparison layer не может выдумывать claims, staff, reviews, prices или licenses, которых нет в verified sources.

## Audit-only dossier rules

- `previewManifestRef` отсутствует.
- `decisionType` = `AUDIT_ONLY`.
- Findings могут содержать только before evidence и recommended changes.
- Если рекомендации сформулированы, они должны быть clearly framed as recommended, not implemented.

## Preview-backed dossier rules

- `previewManifestRef` обязателен.
- Dossier должен опираться на preview-backed evidence там, где заявляется changed state.
- Before/after comparison допустим только для реально preview-visible changes.
- Preserved external flow и editable scope boundaries должны быть отражены так же явно, как в upstream artifacts.

## Constraints that must be preserved

Dossier не имеет права ломать или замалчивать:

- final decision boundary;
- preserved external flow handling;
- approved editable scope;
- non-goals и assumptions из upstream planning artifacts.

## Edge cases

- Audit-only case без preview: dossier все равно валиден как structured review output.
- Preview-backed case с partially visible changes: findings могут смешивать `before-after` и `before-only`, если это clearly labeled.
- External flow preserved: after-state не должен изображать solved backend, если preview показывает только redesigned front layer.
- Mixed-content case с low confidence: dossier может фиксировать uncertainty, но не превращает ее в implemented fact.

## Acceptance criteria

- Документ явно закрепляет dossier как structured source of truth.
- Audit-only и preview-backed modes разделены без двусмысленности.
- Evidence model поддерживает before-only и before/after findings.
- Constraints и non-goals переносятся в review layer без искажений.
- Markdown/PDF clearly отделены как projection layer.

## Out of scope

- PDF layout specification.
- Markdown renderer implementation.
- Presentation design for review documents.
- Marketing copy generation.
