# operator-approval template layer

`templates/operator-approval/APPROVAL.template.md` - human-readable projection для structured approval request / response artifacts.

## Mapping

- `Run / Batch Context` <- `approvalRequest.runId`, `approvalRequest.batchId`, `approvalRequest.gateType`, `approvalRequest.workMode`
- `Requested Lead Verdicts` <- `approvalRequest.items[]`
- `Actual Lead Verdicts` <- `approvalResponse.decisions[]`
- `Notes` <- `approvalRequest.summary`, `approvalResponse.notes`
- `Source Refs` <- `approvalRequest.sourceRefs[]`, related artifact refs from response or audit trail

## Rules

- Template не является source of truth.
- Source of truth остается за `approval-request` и `approval-response` structured artifacts.
- Template пригоден для downstream operator review, но не должен добавлять новые product decisions или менять per-lead verdicts.