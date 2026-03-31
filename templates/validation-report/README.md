# validation-report template layer

`templates/validation-report/VALIDATION.template.md` - human-readable projection для structured validation report artifacts.

## Mapping

- `Report Context` <- `reportId`, `scope`, `generatedAt`
- `Summary` <- `summary`
- `Checks` <- `checks[]`
- `Blocking Issues` <- `blockingIssues[]`
- `Warnings` <- `warnings[]`
- `Assumptions` <- `assumptions[]`

## Rules

- Template не является source of truth.
- Canonical source of truth остается за `validation-report.schema.json` payload.
- Template не должен притворяться CI log, runtime execution log или telemetry stream.
