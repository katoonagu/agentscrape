# 05-approval-gates

## Purpose

Зафиксировать, когда pipeline может продолжать обработку автоматически, когда обязан остановиться на operator review и как работают режимы `autopilot`, `checkpointed` и `audit-only`.

## Approved decisions

- Поддерживаются три режима работы:
  - `autopilot`
  - `checkpointed`
  - `audit-only`
- В `checkpointed` mode approvals идут batch-wise по `10` leads.
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
| `checkpointed` | Pipeline останавливается на approval gates batch-wise по `10` leads и ждет operator decision. |
| `audit-only` | Pipeline выполняет intake, qualification, decision и review/report preparation без preview generation. |

### Gate types

1. Decision gate
   - Срабатывает после qualification и before generation/deploy.
   - Обязателен для external-flow, conflicting и low-confidence borderline cases.
2. Batch gate in `checkpointed`
   - Собирает до `10` lead decisions в один approval batch.
   - После подтверждения batch pipeline может продолжить generation/deploy для approved cases.
3. Release gate before preview
   - Применяется к buildable leads после `INTERNAL_QA`.
   - Может быть объединен с decision gate, если operator review уже покрывает этот риск.

### Approval outcomes

Для buildable case approval outcome должен быть одним из:

- approve as-is;
- downgrade to `AUDIT_ONLY`;
- reject current recommendation и вернуть lead на manual review path.

Для `autopilot`:

- pipeline сам продолжает non-flagged cases;
- flagged cases останавливаются в `AWAITING_APPROVAL`.

Для `checkpointed`:

- даже non-flagged buildable cases идут через batch approval по `10`;
- если в batch меньше `10`, допускается финальный неполный batch при завершении run.

Для `audit-only`:

- approval gate для preview не используется, потому что preview path отсутствует;
- human review может потребоваться только как content/report review, но не как deployment gate.

## Edge cases

- External booking/widget case может быть технически buildable, но без human approval не должен автоматически переходить в preview path.
- Если batch из `10` содержит mixed outcomes, approval должен применяться per lead, а не как один глобальный verdict на весь batch.
- Если confidence низкий на границе между `DEMO_FRONT_ONLY` и `DEMO_EDITABLE_CONTENT`, default путь без явного одобрения - downgrade в `AUDIT_ONLY`.
- Если operator отклоняет buildable recommendation, lead не должен silently возвращаться в autopilot path без нового явного решения.

## Acceptance criteria

- Документ ясно описывает разницу между `autopilot`, `checkpointed` и `audit-only`.
- Batch rule по `10` зафиксирован однозначно.
- Mandatory approval cases перечислены без скрытых исключений.
- Из документа видно, что approval gates относятся к policy/control plane, а не к dashboard implementation.

## Out of scope

- UI/UX механика approval dashboard.
- Notification channels и messaging integrations.
- RBAC/permissions model для операторов.
