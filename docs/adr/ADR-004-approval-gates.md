# Title

ADR-004: Approval gates and work modes

## Status

Accepted

## Context

Pipeline должен поддерживать и автоматический throughput, и контролируемую operator review ветку. Без явных approval gates система либо будет слишком manual, либо начнет auto-ship cases, где recommendation нельзя защитить: hybrid/external-flow leads, conflicting score patterns и low-confidence borderline cases.

## Decision

- В системе есть три `WorkMode`: `autopilot`, `checkpointed`, `audit-only`.
- В `checkpointed` mode approvals идут batch-wise по `10` leads.
- Mandatory human approval обязателен для:
  - hybrid / external-flow cases;
  - conflicting score patterns;
  - low-confidence borderline cases.
- `audit-only` mode не выполняет demo generation и preview deploy.
- Если approval не получен для flagged buildable case, default safe path - downgrade в `AUDIT_ONLY`, а не speculative continuation.

## Consequences

- Pipeline может работать в автоматическом режиме без отказа от human control для рискованных кейсов.
- Approval gates становятся частью policy layer и должны быть отражены в manifests и decision artifacts.
- Implementation должен уметь удерживать cases в `AWAITING_APPROVAL` и обрабатывать batch approvals per lead.

## Rejected alternatives

- Полностью убрать human approval для всех buildable leads.
- Требовать ручное подтверждение для каждого lead во всех режимах.
- Разрешать external-flow и low-confidence cases проходить в preview path без специальных gates.
