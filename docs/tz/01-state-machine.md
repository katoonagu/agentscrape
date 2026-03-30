# 01-state-machine

## Purpose

Зафиксировать единую state machine для pipeline на двух уровнях:

- `RunState` для всего запуска;
- `LeadState` для конкретного lead внутри run.

`LeadState` использует ту же vocabulary, что и `RunState`, но не все состояния применимы к одному lead.

## Approved decisions

- Канонический список состояний: `RUN_CREATED`, `INPUT_SELECTED`, `INGESTING`, `NORMALIZED`, `DEDUPED_BY_DOMAIN`, `QUALIFYING`, `DECISION_MADE`, `GENERATING_DEMO`, `INTERNAL_QA`, `AWAITING_APPROVAL`, `DEPLOYING_PREVIEW`, `PREVIEW_READY`, `GENERATING_REVIEW`, `RUN_DONE`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `CANCELLED`, `PARTIAL_DONE`.
- Для blocked / anti-bot / geo / challenge первый технический сбой переводит объект в `FAILED_RETRYABLE`.
- После одного неудачного retry lead не переводится в build path "по догадке", а уходит в `AUDIT_ONLY` decision path.
- `PARTIAL_DONE` - агрегатное run-level состояние.
- Assumption: `LeadState` может использовать общий enum, но `PARTIAL_DONE` не должен эмититься как terminal state одиночного lead.

## Rules / logic

### Run-level flow

Нормальная последовательность `RunState`:

`RUN_CREATED -> INPUT_SELECTED -> INGESTING -> NORMALIZED -> DEDUPED_BY_DOMAIN -> QUALIFYING -> DECISION_MADE -> GENERATING_DEMO -> INTERNAL_QA -> AWAITING_APPROVAL -> DEPLOYING_PREVIEW -> PREVIEW_READY -> GENERATING_REVIEW -> RUN_DONE`

Допустимые сокращенные ветки:

- Если run работает в `audit-only`, после `DECISION_MADE` он может перейти сразу в `GENERATING_REVIEW` и затем в `RUN_DONE`.
- Если ни один lead не дошел до generation/deploy, но review artifacts сформированы, run все равно может завершиться `RUN_DONE`.
- Если часть lead завершилась успешно, а часть была пропущена, отменена или не дошла до preview, итоговый run может перейти в `PARTIAL_DONE`.

Failure/cancel transitions:

- Любое техническое состояние может перейти в `FAILED_RETRYABLE`, если ошибка потенциально устранима повтором.
- После повторной ошибки run переходит в `FAILED_FINAL`, если продолжение невозможно на уровне всего запуска.
- `CANCELLED` допустим из любого нетерминального состояния по операторскому решению.

### Lead-level flow

Нормальная последовательность `LeadState`:

`RUN_CREATED -> INPUT_SELECTED -> INGESTING -> NORMALIZED -> DEDUPED_BY_DOMAIN -> QUALIFYING -> DECISION_MADE`

Дальше ветка зависит от `PipelineDecision`:

- `SKIP`: lead обычно остается на `DECISION_MADE` как terminal decision state без generation.
- `AUDIT_ONLY`: lead остается на `DECISION_MADE`, затем может быть включен в review/report output без `GENERATING_DEMO`.
- `DEMO_FRONT_ONLY` или `DEMO_EDITABLE_CONTENT`: lead идет в `GENERATING_DEMO -> INTERNAL_QA -> AWAITING_APPROVAL -> DEPLOYING_PREVIEW -> PREVIEW_READY -> GENERATING_REVIEW`.

Retry/failure logic для lead:

- Во время `QUALIFYING` или `GENERATING_DEMO` технический сбой дает `FAILED_RETRYABLE`.
- Разрешен один retry.
- Если retry успешен, lead возвращается в предыдущее рабочее состояние.
- Если retry неуспешен и причина связана с anti-bot / geo / challenge, lead все равно получает business decision `AUDIT_ONLY`, а не speculative demo.
- Если retry неуспешен по другой необратимой технической причине, lead может перейти в `FAILED_FINAL`.

### Applicability table for `LeadState`

| State | Lead applicable | Comment |
| --- | --- | --- |
| `RUN_CREATED` | yes | Lead создан как часть run. |
| `INPUT_SELECTED` | yes | Lead попал в выбранный batch / source set. |
| `INGESTING` | yes | Идет intake/ingestion. |
| `NORMALIZED` | yes | Нормализованы URL, domain, source fields. |
| `DEDUPED_BY_DOMAIN` | yes | Выполнен dedupe по `LeadKey`. |
| `QUALIFYING` | yes | Идет qualification и snapshot selection. |
| `DECISION_MADE` | yes | Принято `PipelineDecision`. |
| `GENERATING_DEMO` | yes | Только для buildable cases. |
| `INTERNAL_QA` | yes | Только после generation. |
| `AWAITING_APPROVAL` | yes | Только если approval gate обязателен или mode = `checkpointed`. |
| `DEPLOYING_PREVIEW` | yes | Только для preview-capable cases. |
| `PREVIEW_READY` | yes | Preview externalized. |
| `GENERATING_REVIEW` | yes | Review dossier по lead. |
| `RUN_DONE` | yes | Допустим как terminal projection lead после успешного полного pipeline. |
| `FAILED_RETRYABLE` | yes | Один retry max. |
| `FAILED_FINAL` | yes | Неустранимая техническая ветка. |
| `CANCELLED` | yes | Оператор остановил lead. |
| `PARTIAL_DONE` | no | Используется как run aggregate only. |

## Edge cases

- Lead без сайта может пройти `INGESTING -> NORMALIZED -> DEDUPED_BY_DOMAIN -> DECISION_MADE` без `QUALIFYING`.
- Duplicate domain lead может завершиться на `DEDUPED_BY_DOMAIN` и затем перейти в `DECISION_MADE` со `SKIP`.
- В `checkpointed` mode buildable lead может оставаться в `AWAITING_APPROVAL` batch-wise, даже если generation технически готова к продолжению.
- В mixed run часть lead может быть на `PREVIEW_READY`, а часть на `DECISION_MADE`; именно этот случай оправдывает `PARTIAL_DONE` на уровне run.

## Acceptance criteria

- Из документа понятно, какие состояния общие для run и lead, а какие применяются только на run-level.
- Правило "один retry перед понижением blocked case в `AUDIT_ONLY`" явно зафиксировано.
- Есть ясная развилка после `DECISION_MADE` для `SKIP`, `AUDIT_ONLY` и demo-capable решений.
- `PARTIAL_DONE` описан как run aggregate, а не как полноценный lead state outcome.

## Out of scope

- Execution internals очередей, workers и job orchestration.
- Подробный SLA/state timeout policy.
- CI/CD workflow и deployment implementation details.
