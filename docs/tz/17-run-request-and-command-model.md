# 17-run-request-and-command-model

## Purpose

Определить canonical contract для operator intent, в котором normalized `run-request` становится source of truth для запуска run, а свободный CLI текст используется только как transport hint или note.

## Approved decisions

- Freeform CLI text не является canonical source of truth.
- Normalized structured `run-request` является canonical source of operator intent.
- Один run request должен уметь выразить:
  - `workMode`;
  - `inputMode` / `inputRefs`;
  - desired execution boundary;
  - `safeLimits` / scope caps;
  - `operatorNotes`;
  - optional `operatorReferences`.
- Один run request не должен неявно расширять product scope.
- Operator references могут существовать, но не заменяют qualification / decision / seed artifacts.

## Source-of-truth hierarchy

Source-of-truth order для operator intent:

1. normalized `run-request`
2. run-level operator audit trail
3. raw CLI text, shell history или terminal transcript only as non-canonical context

Если raw command text конфликтует с normalized run request, приоритет остается за structured request artifact.

## Run request contract

`run-request.schema.json` должен позволять зафиксировать:

- `requestId`
- `operatorId`
- `workMode`
- `inputMode`
- `inputRefs`
- `executionBoundary`
- `safeLimits`
- `operatorNotes`
- `operatorReferences`
- `createdAt`

Run request выражает желаемую границу исполнения, но не отменяет policy boundaries from earlier stages.

## Command vocabulary

Command vocabulary фиксируется как conceptual families, а не syntax spec:

- `run start`
- `run inspect/status`
- `approve request/respond`
- `override apply`
- `run resume`
- `lead retry`
- `run cancel`
- `note add`

Нормализация из command family в structured artifact является обязательной, если action меняет control-plane state или operator intent.

## Input selection model

Поддерживаются два базовых input modes:

- `scrape`
- `manual-list`

`inputRefs` должны указывать на explainable sources operator intent, например:

- source file;
- scrape query source;
- curated lead list;
- prior run handoff list.

Run request не должен в одиночку переопределять `LeadKey`, qualification scope или decision policy.

## Execution boundary / stop-after model

`executionBoundary` описывает, до какого planning stage operator intends the run to proceed:

- `decision`
- `generation`
- `preview`
- `review`

Interpretation rules:

- `decision` - остановка после финального decision layer.
- `generation` - остановка после generation handoff artifacts.
- `preview` - попытка довести buildable path до preview manifest.
- `review` - доведение cases до review dossier path where allowed.

Execution boundary не делает invalid path valid. Например, `audit-only` request с boundary `preview` не легализует preview generation.

## Operator references and notes

- `operatorNotes` позволяют зафиксировать contextual constraints или handling preferences.
- `operatorReferences` позволяют добавить external or local directional references.
- Notes и references не заменяют verified content, qualification findings или design seed.
- Operator references допустимы как direction input, но не как factual proof for claims.

## Defaults and assumptions

- Assumption: default `executionBoundary` = `preview` для `autopilot` и `checkpointed`, если request не задает иное.
- Assumption: default `executionBoundary` = `review` для `audit-only`, если request не задает иное.
- Assumption: `safeLimits` являются strongly recommended для больших runs, но могут отсутствовать в минимальном request.
- Assumption: raw CLI text может быть отражен только в notes или audit references, но не как canonical field.

## Edge cases

- Run request может intentionally stop at `decision`, even if some leads are buildable.
- `manual-list` request может содержать leads без сайта; это не отменяет later `NO_SITE` skip behavior.
- `scrape` request может иметь broad input, но `safeLimits` должен ограничивать blast radius.
- Operator references могут быть нерелевантны конкретному lead; это не должно silently менять decision path.
- Если request и later override конфликтуют, override должен быть explicit и traceable.

## Acceptance criteria

- Документ однозначно делает `run-request` canonical operator intent artifact.
- Input model и execution boundary перечислены явно.
- Связь между raw command text и normalized request объяснена без двусмысленности.
- `safeLimits`, notes и references описаны как bounded controls, а не как способ скрытого расширения scope.
- Документ не превращается в actual CLI syntax spec.

## Out of scope

- Shell parser grammar.
- Autocomplete, aliases и command UX ergonomics.
- Actual ingestion adapters for `scrape` or `manual-list`.
- Free-form chat or dashboard operator interfaces.