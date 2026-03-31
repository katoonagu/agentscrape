# 16-cli-operator-workflow

## Purpose

Зафиксировать CLI-first operating model для Stage `6`, чтобы запуск, управление и контроль run со стороны оператора происходили через structured control-plane artifacts, а не через неформальные терминальные действия без traceability.

## Approved decisions

- CLI остается primary operator surface.
- Dashboard в `v1` не вводится.
- Partial progress и mixed-outcome run являются нормальным сценарием.
- Operator commands не являются source of truth сами по себе; source of truth - normalized structured artifacts.
- Batch approvals в `checkpointed` mode идут по `10`, но решения всегда per lead.
- Resume / retry / cancel должны быть traceable и не терять source artifacts.
- Один operator action не должен silently менять несколько decision boundaries без явного structured record.

## CLI-first operating model

CLI в Stage `6` трактуется как operator surface для:

- запуска run;
- просмотра статуса и artifact refs;
- запроса approval batch;
- фиксации approval response;
- применения bounded override;
- resume / retry / cancel;
- добавления operator note.

CLI surface может быть human-friendly, но canonical intent всегда нормализуется в structured artifacts:

- `run-request`
- `approval-request`
- `approval-response`
- `operator-override`
- `operator-audit-log`

## Run lifecycle from operator perspective

1. Operator инициирует run.
2. Raw CLI intent нормализуется в `run-request`.
3. `run-manifest` начинает использовать этот request как top-level source ref.
4. Run идет по pipeline до тех пор, пока policy или chosen execution boundary не требует остановки.
5. Если нужен human approval, создается `approval-request`.
6. Operator фиксирует `approval-response` per lead.
7. Если нужно локально уточнить scope или constraints, создается bounded `operator-override`.
8. Resume / retry / cancel фиксируются в `operator-audit-log` и отражаются в run state без потери refs.
9. Run приходит к `RUN_DONE`, `PARTIAL_DONE`, `FAILED_FINAL` или `CANCELLED`.

## Work modes and operator expectations

| WorkMode | Operator expectation |
| --- | --- |
| `autopilot` | Operator вмешивается только в flagged cases, retries, overrides или cancellations. |
| `checkpointed` | Operator регулярно обрабатывает approval batches по `10` leads и подтверждает continuation per lead. |
| `audit-only` | Operator управляет stop boundary так, чтобы run не переходил в generation / preview, но review artifacts могли быть выпущены. |

## Command families

Command families являются conceptual vocabulary, а не syntax spec:

- `run start`
- `run inspect/status`
- `approve request`
- `approve respond`
- `override apply`
- `run resume`
- `lead retry`
- `run cancel`
- `note add`

Каждая такая command family должна сводиться к одному или нескольким structured records, а не оставаться только в terminal history.

## Batch handling rules

- `checkpointed` batches capped at `10` leads.
- Финальный batch может быть меньше `10`.
- Batch является transport grouping и не превращается в единый decision для всех items.
- Per-lead verdict обязателен внутри каждого approval response.
- Один blocked lead внутри batch не должен стирать traceability для остальных leads.

## Resume / retry / cancel semantics

- `run resume` продолжает paused / awaiting-approval path и не создает новый run silently.
- `lead retry` применяется к конкретному lead path и не обязан перезапускать весь run.
- `run cancel` фиксирует окончание control path, но не удаляет already created artifacts.
- Все эти действия должны быть отражены в `operator-audit-log`.
- Prior refs не должны silently пропадать после resume, retry или cancel.

## Per-run vs per-lead operations

Per-run operations:

- start;
- inspect / status;
- resume;
- cancel;
- run-level notes.

Per-lead operations:

- per-lead approval verdict;
- lead retry;
- lead-scoped override;
- lead-scoped note.

Batch-scoped operations:

- approval request batch;
- approval response batch;
- batch-scoped review notes.

## Human approval interactions

- Mandatory approval cases из earlier stages остаются без изменения.
- Approval requests и responses оформляются как structured artifacts.
- В `checkpointed` mode even non-flagged buildable items могут идти через batch approval, но policy-sensitive leads все равно должны сохранять explicit reasons for review.
- Operator response не должен bypass decision boundary silently: если требуется reevaluation или downgrade, это должно быть записано explicitly.

## Edge cases

- Один run может содержать `SKIP`, `AUDIT_ONLY`, buildable и blocked leads одновременно.
- Operator может отменить run после частичного прогресса; already created artifacts остаются traceable.
- Operator может перезапустить только один lead после retryable failure, не переписывая run history.
- Approval response может быть частичным; необработанные leads остаются pending и не считаются implicitly approved.
- Override после approval допускается, если он bounded и traceable; silent bulk mutation нескольких leads без structured record недопустим.

## Acceptance criteria

- CLI primacy и отсутствие dashboard clearly зафиксированы.
- Run lifecycle описан с operator perspective без runtime parser detail.
- Batch, resume, retry и cancel semantics перечислены явно.
- Per-run, per-lead и batch-scoped operations различаются однозначно.
- Из документа видно, что source of truth - structured artifacts, а не raw terminal text.

## Out of scope

- Actual CLI command syntax и parser implementation.
- Terminal UI rendering, colors, shortcuts и TUI behavior.
- Background worker scheduling.
- Dashboard-based operator surface.