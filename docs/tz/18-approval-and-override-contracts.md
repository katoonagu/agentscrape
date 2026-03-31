# 18-approval-and-override-contracts

## Purpose

Определить structured contracts для approval requests, approval responses и bounded operator overrides так, чтобы human intervention была auditable и не разрушала already approved policy boundaries.

## Approved decisions

- `approval-request` является structured artifact.
- `approval-response` является structured artifact.
- `operator-override` является отдельным structured artifact.
- Downgrade path допускается проще, чем upgrade path.
- Scope-expanding override не может silently обходить policy.
- Operator может:
  - downgrade buildable case to `AUDIT_ONLY`;
  - constrain editable scope;
  - constrain page count / section scope;
  - pin preset / design direction only if traceable;
  - preserve external flow explicitly;
  - add operator note / assumption / reference.
- Operator не может:
  - silently fabricate content;
  - silently remove preserved external flow;
  - silently promote case в CMS/CRM/app logic territory;
  - silently widen editable scope beyond approved blocks.
- Если нужен promotion / widening override, это должно идти через explicit structured path с rationale и human accountability, а не как безмолвная правка.

## Approval request semantics

`approval-request` должен фиксировать:

- `runId` и `batchId`;
- gate type;
- active `workMode`;
- items requiring verdict;
- per-lead current decision;
- approval reasons;
- request summary;
- source refs;
- request status.

Batch semantics:

- `checkpointed` batches capped at `10` leads;
- smaller final batch allowed;
- batch existence не отменяет lead-level traceability.

## Approval response semantics

`approval-response` должен фиксировать:

- связь с `approval-request`;
- `runId` и `batchId`;
- operator identity;
- per-lead verdict;
- resulting decision where applicable;
- notes / timestamp.

Per-lead verdict inside response обязателен. Отсутствующий verdict по конкретному lead означает, что этот lead не получил final approval outcome.

## Override taxonomy

Standard bounded override taxonomy:

- `downgrade-decision`
- `constrain-editable-scope`
- `constrain-page-scope`
- `constrain-section-scope`
- `pin-preset`
- `pin-design-direction`
- `preserve-external-flow`
- `add-note`
- `add-assumption`
- `add-reference`

Эта taxonomy intentionally не включает silent widening or promotion override type.

## Allowed overrides

Allowed bounded overrides должны:

- быть traceable к run и, где применимо, к lead;
- ссылаться на target artifact kind;
- содержать rationale;
- явно указывать, нужен ли reevaluation downstream artifacts.

Typical allowed examples:

- downgrade buildable case to `AUDIT_ONLY`;
- ограничить editable scope только `hero`, `services` и `cta`;
- убрать слабое secondary service page из build plan;
- закрепить chosen preset или design direction;
- явно зафиксировать preserved external booking surface;
- добавить operator assumption или reference.

## Forbidden overrides

Forbidden override behavior:

- fabricated claims, prices, staff identities, licenses или reviews;
- removal of preserved external flow without explicit accountable path;
- silent expansion в CMS/CRM/app logic territory;
- silent widening of editable scope beyond approved blocks;
- silent multi-artifact mutation без отдельного structured record.

## Downgrade vs upgrade rules

- Downgrade и constraint overrides входят в normal operator path.
- Upgrade или widening path не считается normal override.
- Если widening действительно нужен, он должен быть оформлен как explicit reevaluation path with rationale, approval and downstream traceability.
- Simple manual edit of downstream artifact без structured override недопустим.

## Batch-scoped vs lead-scoped actions

- Approval requests / responses обычно batch-scoped by transport.
- Approval verdict всегда lead-scoped по смыслу.
- Overrides по умолчанию lead-scoped, потому что они влияют на конкретный boundary или artifact chain.
- Batch-scoped override допустим только если effect и rationale одинаково применимы ко всей группе и это не стирает lead-level traceability.

## Edge cases

- Один approval batch может содержать leads с разными resulting outcomes.
- Approval response может вернуть часть leads на reevaluation, а часть оставить approved.
- Override после approval response допустим, если он bounded и traceable.
- Если override меняет scope downstream artifact, `requiresReevaluation = true` должен явно показать, что later artifact may need refresh.
- Внешний flow может быть preserved by override, но не internalized by override.

## Acceptance criteria

- Approval request / response / override clearly определены как отдельные structured artifacts.
- Allowed и forbidden override behaviors перечислены явно.
- Downgrade path отделен от widening / promotion path.
- Batch-scoped и lead-scoped semantics не смешиваются.
- Из документа видно, что overrides не являются unrestricted superuser bypass.

## Out of scope

- Role-based permissions model.
- Real-time collaboration on approvals.
- Dashboard moderation UI.
- Worker-side automatic override execution logic.