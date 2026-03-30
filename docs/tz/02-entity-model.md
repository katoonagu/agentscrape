# 02-entity-model

## Purpose

Зафиксировать сущности planning layer и связи между ними, чтобы Stage `1` и Stage `2` могли опираться на единый словарь объектов, ключей и ссылок.

## Approved decisions

- Главная единица учета - `LeadKey = eTLD+1`.
- Субдомены считаются отдельными только если явно представляют отдельный продукт или отдельный бизнес.
- Lead без сайта не проходит в qualification и получает `reasonCode = NO_SITE`.
- Qualification, decision и preview artifacts существуют как отдельные planning entities, а не как неформальные побочные файлы.
- Generated builds и preview artifacts не хранятся в git-репозитории.

## Rules / logic

### Primary entities

| Entity | Role | Canonical key |
| --- | --- | --- |
| `Lead` | Нормализованный business/site candidate из intake source. | `leadKey` |
| `SiteSnapshot` | Снимок сайта для qualification: `home + 2 key service pages` или one-page sections. | `snapshotId` |
| `Qualification` | Результат rubric evaluation и score set. | `qualificationId` |
| `Decision` | Финальное `PipelineDecision` и reason codes. | `decisionId` |
| `RunManifest` | Контейнер одного запуска CLI pipeline. | `runId` |
| `PreviewManifest` | Ссылка на внешний preview/artifact для buildable lead. | `previewId` |

### `Lead`

- `Lead` описывает один business candidate после normalization.
- Канонический идентификатор для dedupe - `leadKey`, который равен `eTLD+1`.
- `canonicalDomain` хранит домен, по которому был рассчитан `LeadKey`.
- `siteUrl` указывается только если сайт найден и подтвержден.
- `Lead` может ссылаться на `duplicateOfLeadKey`, если он был поглощен существующим canonical lead.
- Если subdomain - это не отдельный продукт/бизнес, он не создает новый primary lead и должен быть нормализован в уже существующий `LeadKey`.

### `SiteSnapshot`

- `SiteSnapshot` хранит именно qualification view, а не полный crawl сайта.
- Нормальный набор - `home + 2 key service pages`.
- Если service pages неочевидны, выбираются наиболее коммерчески важные страницы.
- Для one-page site используются виртуальные views: `hero`, `service section`, `contact/booking section`.
- Snapshot может содержать access metadata: anti-bot, geo, challenge, external flow indicators.

### `Qualification`

- `Qualification` агрегирует evidence notes, выбранный snapshot scope, `ScoreSet` и provisional recommendation.
- Канонический `ScoreSet`:
  - `redesignValue`
  - `buildFeasibility`
  - `contentSufficiency`
  - `complexity`
  - `confidence`
- Все score fields целочисленные и лежат в диапазоне `1..10`.
- Assumption: `confidence` выражает confidence in recommendation, а не только scrape success confidence.

### `Decision`

- `Decision` фиксирует одно из `PipelineDecision`:
  - `SKIP`
  - `AUDIT_ONLY`
  - `DEMO_FRONT_ONLY`
  - `DEMO_EDITABLE_CONTENT`
- `Decision` также хранит `reasonCodes`, признак обязательного human approval и ограничение demo scope.
- `DEMO_EDITABLE_CONTENT` разрешен только для ограниченного списка editable content blocks.

### `RunManifest`

- `RunManifest` агрегирует mode, state, input source summary, список lead refs, counts и external artifact references.
- Один `RunManifest` может включать несколько lead с разными terminal outcomes.
- `PARTIAL_DONE` допустим только как run-level aggregate state.

### `PreviewManifest`

- `PreviewManifest` описывает внешний preview deployment или внешний artifact.
- Он не хранит generated source code и не предполагает, что build output находится в репозитории.

### Relationships

- Один `RunManifest` содержит много `Lead`.
- Один `Lead` может иметь не более одного canonical `Qualification` и одного canonical `Decision` на конкретный run.
- `PreviewManifest` создается только для решений `DEMO_FRONT_ONLY` или `DEMO_EDITABLE_CONTENT`.
- `Lead` без сайта может существовать как запись intake/dedupe слоя, но не обязан иметь `SiteSnapshot` или `Qualification`.

## Edge cases

- `www.example.com` и `example.com` должны сводиться к одному `LeadKey`.
- `clinic.example.com` может стать отдельным lead только если это отдельный продукт/бизнес, а не технический subdomain.
- Duplicate lead из manual list и scrape source не создает две сущности; вторичная запись указывает на `duplicateOfLeadKey`.
- Сайт с внешним booking widget все равно может иметь `SiteSnapshot`, `Qualification` и `Decision`, но decision scope должен сохранять внешний flow.

## Acceptance criteria

- Документ однозначно отвечает, что является primary entity и как работает dedupe.
- Видно, какие сущности обязательны для всех lead, а какие создаются только по buildable/site-present path.
- `LeadKey = eTLD+1` и special handling subdomains зафиксированы без двусмысленности.
- Сущности соответствуют ожидаемым schema files в `packages/schemas/`.

## Out of scope

- Runtime DB schema, ORM models и storage engine details.
- Crawl graph, DOM-level extraction model и screenshot pipeline internals.
- Generated source tree и preview hosting implementation.
