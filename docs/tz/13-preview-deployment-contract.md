# 13-preview-deployment-contract

## Purpose

Определить provider-neutral contract для preview deployment layer, чтобы Stage `5` связывал generation handoff artifacts с внешним preview record без превращения planning repo в deploy adapter или build log.

## Approved decisions

- Preview path доступен только для:
  - `DEMO_FRONT_ONLY`
  - `DEMO_EDITABLE_CONTENT`
- Preview не создается для:
  - `SKIP`
  - `AUDIT_ONLY`
- Preview manifest остается provider-neutral.
- Preview manifest не хранит generated code.
- Preview manifest не означает production readiness.
- Preview manifest не означает, что backend/app logic solved.
- `buildStoredInRepo` остается `false`.
- `previewUrl` - reference на внешний preview, а не источник истины бизнес-логики.
- preserved external flow должен сохраняться и в preview layer.

## Entry criteria

Preview может стартовать только если одновременно соблюдены условия:

- generation-eligible decision уже финализирован;
- redesign brief существует;
- demo build plan существует;
- generation handoff не нарушает Stage `4` boundaries;
- required human approval уже satisfied или явно tracked как blocker;
- preserved constraints и external flow handling зафиксированы в upstream artifacts.

## Preview manifest semantics

`preview-manifest.schema.json` описывает provider-neutral preview record и должен отражать:

- identity preview artifact;
- owning `runId` и `leadKey`;
- allowed preview-capable decision;
- refs на upstream generation handoff artifacts;
- coarse provider label без provider-specific internals;
- lifecycle status preview record;
- external preview URL и/или external artifact URI;
- preserved external flow handling;
- blockers, если preview path еще не ready.

Interpretation rules:

- `previewUrl` указывает на внешний preview и не доказывает solved backend.
- `artifactUri` может ссылаться на внешний build artifact, но не переносит generated code в repo.
- Preview manifest не является deploy log и не должен хранить provider-specific low-level fields.

## Readiness rules

Preview record может считаться `ready`, если:

- decision type preview-eligible;
- redesign brief и demo build plan traceable from preview manifest;
- no known generation boundary violation;
- required approval gates закрыты;
- preview artifact или external preview URL реально существует как external reference.

Если эти условия не выполнены, preview может быть `requested`, `building`, `blocked` или `failed`, но не `ready`.

## Failure rules

Preview manifest должен поддерживать explicit failure / blocker signaling, если:

- approval еще pending;
- redesign brief отсутствует;
- demo build plan отсутствует;
- generation boundary violated;
- external preview build failed.

Failure/blocker record не должен silently скрывать, что preview path был невозможен или остановлен.

## External artifact rules

- Все preview artifacts живут вне git repo.
- `buildStoredInRepo` всегда `false`.
- Preview manifest хранит только references и coarse metadata.
- Generated builds, deploy logs, provider configs и binary artifacts не становятся source of truth внутри planning repo.

## Human approval interactions

- Если earlier stages или current preview path требуют human approval, preview manifest должен либо отражать satisfied state upstream, либо фиксировать blocker.
- Ambiguous external flow handling, low-confidence redesign direction или boundary risk не должны silently проходить в ready preview.
- Preview layer может ссылаться на approval status/blocker, но не должна переопределять upstream decision policy.

## Edge cases

- `DEMO_FRONT_ONLY` case с preserved external booking flow: preview допустим, но booking path остается external.
- `DEMO_EDITABLE_CONTENT` case: preview может показывать limited editable scope, но не расширяет его.
- Buildable case с blocked preview: preview manifest может существовать без `previewUrl`, если status отражает blocker.
- Audit-only case: preview manifest не создается, даже если есть human-readable recommendations.

## Acceptance criteria

- Документ однозначно ограничивает preview eligibility buildable decisions only.
- Preview manifest отделен от generated code и deployment internals.
- Readiness и failure rules перечислены явно.
- Preserved external flow и `buildStoredInRepo = false` зафиксированы без исключений.
- Human approval interactions не создают параллельную decision logic.

## Out of scope

- Deploy adapter implementation.
- Provider-specific build steps и secrets handling.
- Runtime preview health checks.
- Production deployment policy.
