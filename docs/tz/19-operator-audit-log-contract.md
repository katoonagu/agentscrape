# 19-operator-audit-log-contract

## Purpose

Определить canonical operator audit trail, который связывает operator/system interaction layer с run, batch, lead и artifact refs без подмены downstream manifests и review artifacts.

## Approved decisions

- Operator audit log является canonical record operator/system interaction layer.
- Audit log не заменяет downstream artifacts, а связывает их.
- Audit log должен покрывать как минимум:
  - `RUN_REQUESTED`
  - `RUN_STARTED`
  - `APPROVAL_REQUESTED`
  - `APPROVAL_RESPONDED`
  - `OVERRIDE_APPLIED`
  - `LEAD_RETRIED`
  - `RUN_RESUMED`
  - `RUN_CANCELLED`
  - `NOTE_ADDED`
- Audit trail должен быть traceable к run и, где применимо, к lead / batch / artifact refs.

## Audit log role

`operator-audit-log` нужен для того, чтобы:

- фиксировать chronology operator/system actions;
- связывать run request, approval, override и retry/resume/cancel actions;
- обеспечивать accountability без превращения audit log в source of truth for decisions or content.

Decision, preview, review и override payloads остаются в своих собственных structured artifacts.

## Event model

Каждый event в audit log должен отражать:

- event identity;
- event type;
- timestamp;
- actor type (`operator` или `system`);
- optional `operatorId`;
- optional `leadKey`;
- optional `batchId`;
- optional artifact refs;
- optional notes.

Event order должен быть reconstructable по timestamps и traceable refs.

## Required fields

Top-level log contract должен содержать:

- `auditLogId`
- `runId`
- `events`
- `createdAt`
- `updatedAt`

Минимальный event contract должен содержать:

- `eventId`
- `eventType`
- `timestamp`
- `actorType`

## Event categories

Core event categories:

- run initiation: `RUN_REQUESTED`, `RUN_STARTED`
- approval flow: `APPROVAL_REQUESTED`, `APPROVAL_RESPONDED`
- operator intervention: `OVERRIDE_APPLIED`, `NOTE_ADDED`
- recovery / lifecycle: `LEAD_RETRIED`, `RUN_RESUMED`, `RUN_CANCELLED`

Этот список intentionally coarse и не превращает audit log в analytics platform.

## Per-run vs per-lead events

Per-run events:

- `RUN_REQUESTED`
- `RUN_STARTED`
- `RUN_RESUMED`
- `RUN_CANCELLED`

Per-lead or lead-affecting events:

- `OVERRIDE_APPLIED`
- `LEAD_RETRIED`
- lead-scoped `NOTE_ADDED`
- per-lead effects within `APPROVAL_RESPONDED`

Batch-scoped events:

- `APPROVAL_REQUESTED`
- `APPROVAL_RESPONDED`

## Ordering and traceability rules

- Audit log не должен стирать earlier events when later operator action occurs.
- Resume / retry / cancel must preserve traceability to prior refs.
- Artifact refs inside events должны указывать на explainable structured artifacts.
- Если одно operator action касается только subset of leads, event должен быть scoped accordingly.
- Audit log не заменяет `run-manifest`, а дополняет его как interaction-layer record.

## Edge cases

- System-created events и operator-created events могут сосуществовать в одном log, но `actorType` должен оставаться explicit.
- Approval response на batch может одновременно иметь run-level and lead-level significance.
- Retry после failed preview не должен обнулять earlier preview or approval refs.
- Cancel after partial completion остается valid auditable state, even if some leads already reached final artifacts.
- Raw shell history itself не считается audit log.

## Acceptance criteria

- Документ явно закрепляет audit log как canonical interaction record.
- Event model, categories и traceability rules перечислены без двусмысленности.
- Per-run, per-lead и batch-scoped события различаются явно.
- Audit log отделен от downstream manifests и review artifacts.
- Документ не превращает audit log в telemetry or analytics platform.

## Out of scope

- Analytics dashboards.
- Streaming/event bus infrastructure.
- Low-level telemetry ingestion.
- Security monitoring platform design.