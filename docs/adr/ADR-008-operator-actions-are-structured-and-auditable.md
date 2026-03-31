# ADR-008: Operator Actions Are Structured and Auditable

## Title

Operator actions are normalized into structured artifacts and recorded in an auditable trail.

## Status

Accepted

## Context

By Stage `5`, the repository already treats planning, preview and review artifacts as structured source-of-truth records. Stage `6` introduces a CLI-first operator workflow, which creates a new risk: if operator intent, approvals, overrides and lifecycle actions remain only in freeform CLI text or shell history, the control plane loses traceability, replayability and accountability.

The system also needs to preserve previously approved boundaries:

- no dashboard-first operator model in `v1`;
- no silent widening of decision scope;
- no widening of editable scope beyond approved blocks;
- no silent removal of preserved external flow;
- mixed-outcome runs remain valid.

## Decision

We normalize operator actions into dedicated structured artifacts:

- `run-request`
- `approval-request`
- `approval-response`
- `operator-override`
- `operator-audit-log`

The CLI remains the primary operator surface, but freeform command text is not canonical source of truth. Canonical intent and intervention are recorded through normalized JSON contracts and linked from `run-manifest`.

Approval batches remain transport groupings, but final verdicts are always stored per lead. Bounded overrides may constrain, downgrade, annotate or pin direction, but they may not silently widen policy boundaries.

Operator/system interaction history is recorded in `operator-audit-log`, which complements downstream artifacts without replacing them.

## Consequences

- Operator intent becomes replayable and auditable.
- Resume / retry / cancel can preserve prior artifact refs instead of overwriting control history.
- Approval batches remain manageable in CLI while lead-level accountability is preserved.
- Structured artifacts can be projected into human-readable templates without losing canonical source-of-truth behavior.
- Runtime CLI parser implementation remains a later concern and is not required to finalize Stage `6` contracts.

## Rejected alternatives

- Keeping operator intent only in raw CLI text or shell history.
- Treating a batch approval as one global decision without per-lead verdicts.
- Allowing overrides to act as an unrestricted superuser bypass.
- Making a dashboard the primary operator surface for `v1`.