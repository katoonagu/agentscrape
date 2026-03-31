# 05-approval-gates

## Purpose

Зафиксировать, когда pipeline может продолжать обработку автоматически, когда обязан остановиться на operator review и как approval gates оформляются как structured control-plane artifacts в режимах `autopilot`, `checkpointed` и `audit-only`.

## Approved decisions

- Поддерживаются три режима работы:
  - `autopilot`
  - `checkpointed`
  - `audit-only`
- В `checkpointed` mode approvals идут batch-wise по `10` leads.
- Approval request и approval response становятся отдельными structured artifacts.
- Per-lead verdict обязателен внутри каждого approval batch.
- Batch grouping трактуется как transport / UX grouping, а не как один глобальный decision на все leads.
- Mandatory human approval нужен для:
  - hybrid / external-flow cases;
  - conflicting score patterns;
  - low-confidence borderline cases.
- `audit-only` не должен переходить в demo generation и preview deploy.

## Rules / logic

### Work modes

| WorkMode | Behavior |
| --- | --- |
| `autopilot` | Pipeline идет автоматически, кроме кейсов, где approval обязателен по policy. |
| `checkpointed` | Pipeline останавливается на approval gates batch-wise по `10` leads и ждет operator verdict per lead. |
| `audit-only` | Pipeline выполняет intake, qualification, decision и review/report preparation без preview generation. |

### Gate artifacts

- `approval-request` фиксирует, какой batch или lead требует operator review, почему gate возник и какие source refs относятся к этому gate.
- `approval-response` фиксирует structured verdict per lead и не заменяется свободным текстом в CLI.
- Human-readable approval template может использоваться как projection layer, но source of truth остается за structured artifacts.

### Gate types

1. Decision gate
   - Срабатывает после qualification и before generation / deploy.
   - Обязателен для external-flow, conflicting и low-confidence borderline cases.
2. Batch gate in `checkpointed`
   - Собирает до `10` lead decisions в один approval batch.
   - Даже если batch транспортируется как единый пакет, verdict все равно выносится per lead.
3. Release gate before preview
   - Применяется к buildable leads после `INTERNAL_QA`.
   - Может быть объединен с earlier gate, если operator response уже закрывает тот же риск и это traceable по artifacts.

### Approval outcomes

Per-lead approval outcome должен быть одним из:

- approve current path;
- downgrade to `AUDIT_ONLY`;
- return for reevaluation.

Для `autopilot`:

- pipeline сам продолжает non-flagged cases;
- flagged cases останавливаются в `AWAITING_APPROVAL` до появления structured approval response.

Для `checkpointed`:

- buildable path идет через batch approval по `10`;
- если в batch меньше `10`, допускается финальный неполный batch при завершении run;
- наличие общего batch response не отменяет requirement на per-lead traceability.

Для `audit-only`:

- preview gate не используется, потому что preview path отсутствует;
- human review возможен только как content/report review, но не как deployment gate.

## Edge cases

- External booking/widget case может быть технически buildable, но без human approval не должен автоматически переходить в preview path.
- Если batch из `10` содержит mixed outcomes, approval должен применяться per lead, а не как один глобальный verdict на весь batch.
- Если на один lead внутри batch verdict отсутствует, этот lead остается blocked, даже если по остальным leads batch уже обработан.
- Если confidence низкий на границе между `DEMO_FRONT_ONLY` и `DEMO_EDITABLE_CONTENT`, default путь без явного одобрения - downgrade в `AUDIT_ONLY` или reevaluation path.
- Если operator отклоняет buildable recommendation, lead не должен silently возвращаться в autopilot path без нового explicit structured record.

## Acceptance criteria

- Документ ясно описывает разницу между `autopilot`, `checkpointed` и `audit-only`.
- Batch rule по `10` зафиксирован однозначно.
- Mandatory approval cases перечислены без скрытых исключений.
- Structured request/response artifacts и per-lead verdict requirement описаны явно.
- Из документа видно, что approval gates относятся к policy/control plane, а не к dashboard или CLI parser implementation.

## Out of scope

- CLI parser syntax и command execution internals.
- Notification channels и messaging integrations.
- RBAC/permissions model для операторов.
- Dashboard-based approval UI.