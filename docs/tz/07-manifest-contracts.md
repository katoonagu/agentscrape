# 07-manifest-contracts

## Purpose

Определить contracts для planning/manifests слоя, чтобы subsequent implementation использовал стабильные JSON payloads для lead intake, qualification output, decision output, run orchestration и preview references.

## Approved decisions

- Канонические schema files:
  - `packages/schemas/lead.schema.json`
  - `packages/schemas/site-snapshot.schema.json`
  - `packages/schemas/qualification.schema.json`
  - `packages/schemas/decision.schema.json`
  - `packages/schemas/run-manifest.schema.json`
  - `packages/schemas/preview-manifest.schema.json`
- Все schema files используют JSON Schema draft-07.
- Schemas описывают planning/manifests слой, а не runtime implementation internals.
- Required fields должны быть только там, где без них contract теряет смысл.

## Rules / logic

### `lead.schema.json`

- Описывает нормализованный lead record.
- Должен покрывать:
  - lead identity;
  - source metadata;
  - canonical domain / `LeadKey`;
  - site presence;
  - dedupe pointer;
  - optional site URL.

### `site-snapshot.schema.json`

- Описывает qualification surface, а не полный crawl.
- Должен покрывать:
  - selected pages/sections;
  - snapshot metadata;
  - access barrier indicators;
  - external flow flags.

### `qualification.schema.json`

- Описывает rubric result.
- Должен покрывать:
  - selected scope;
  - evidence notes;
  - `ScoreSet`;
  - blocker/retry result;
  - recommended decision;
  - mandatory approval signal.

### `decision.schema.json`

- Описывает финальное pipeline decision.
- Должен покрывать:
  - `PipelineDecision`;
  - `ReasonCode[]`;
  - approval requirement/status;
  - demo scope boundary;
  - editable blocks only when разрешен `DEMO_EDITABLE_CONTENT`.

### `run-manifest.schema.json`

- Описывает один CLI run как planning container.
- Должен покрывать:
  - run metadata;
  - `WorkMode`;
  - `RunState`;
  - input summary;
  - per-lead refs;
  - counts;
  - external artifact refs.

### `preview-manifest.schema.json`

- Описывает внешний preview deployment или artifact reference.
- Не должен содержать in-repo build paths или runtime build internals.
- Должен покрывать:
  - preview identity;
  - owning run/lead;
  - allowed preview-capable decision;
  - provider/status;
  - external URL / artifact URI;
  - explicit `buildStoredInRepo = false`.

### Examples

- Example files рядом со schemas должны быть реалистичными и парситься against their schemas.
- Examples не должны содержать production secrets, токены или реальные credentials.

## Edge cases

- `Lead` без сайта может быть валиден без `siteUrl`, но должен явно отражать отсутствие сайта.
- `PreviewManifest` недопустим для `SKIP` и `AUDIT_ONLY`.
- `Qualification` может указывать blocker path и retry result даже если итоговый `Decision` позже станет `AUDIT_ONLY`.
- `RunManifest` может ссылаться на mixed outcomes within one run.

## Acceptance criteria

- Все schema files существуют и содержат согласованные enum'ы.
- Examples structurally match their schemas.
- `ReasonCode`, `PipelineDecision`, `WorkMode` и pipeline states не расходятся между docs и schemas.
- В contracts отсутствуют runtime-specific storage/build details, противоречащие Stage `0..2`.

## Out of scope

- Database migrations и storage adapters.
- Queue payloads, worker events и telemetry envelopes.
- Full preset schema для `packages/niche-presets/`.
