# 26-cross-artifact-consistency-rules

## Purpose

Зафиксировать правила consistency между docs, schemas, examples, templates, skills, registry и install-plan, чтобы весь planning/control-plane слой оставался согласованным и пригодным для repo-wide verification.

## Approved decisions

- Docs, schemas, examples, templates, skills, registry и install-plan не должны противоречить друг другу.
- Example обязан соответствовать своей schema.
- Template не должен противоречить canonical structured contract.
- `registry.json.sourcePath` обязан существовать.
- `skillId`, folder layout и `SKILL.md` должны быть согласованы.
- Install plan `skillId` должен resolve through registry.
- Mixed-outcome examples допустимы, если decision path объясняет missing refs.
- Support artifacts не должны silently менять business rules.

## Artifact families

- Business artifacts.
- Operator/control artifacts.
- Support/control artifacts.
- Projection templates.
- Authored skills.

## Consistency rules

- README и roadmap не должны заявлять stage progression, противоречащий TZ/ADR surface.
- TZ docs не должны расходиться с schema enums и field roles.
- Examples не должны моделировать flows, запрещенные authoritative docs.
- Templates не должны вводить новые required fields или новые policy decisions.
- Skills не должны переопределять docs/contracts/schemas.
- Registry и install-plan должны ссылаться на существующие source files и согласованные `skillId` values.

## Required reference patterns

- `*.example.json` рядом с соответствующей schema.
- `registry.json.sourcePath -> packages/skills/<skillId>/SKILL.md`.
- `install-plan.installEntries[].skillId` должен существовать в registry.
- Mixed-outcome `run-manifest` examples обязаны иметь explainable missing refs по decision path.

## Naming and ID conventions

- Schemas: `*.schema.json`.
- Examples: `*.example.json`.
- Variant examples: `*.audit-only.example.json` и аналогичные explicit suffixes.
- Skills: `packages/skills/<skillId>/SKILL.md`.
- Skill registry entry `skillId` должен совпадать с folder name.

## Example-to-schema expectations

- Структурная валидность обязательна.
- Example не должен скрывать warnings или boundary assumptions за неявными omission'ами.
- Example может быть частично mixed-outcome, если это explicitly explainable и schema-valid.

## Template-to-contract alignment

- Heading structure template должна map to structured contract fields.
- Projection-only layer не может добавлять новые canonical statuses, refs или policy branches.
- Template wording не должен противоречить truth model structured artifact.

## Skill-registry/source consistency

- Каждый registry entry обязан ссылаться на существующий `SKILL.md`.
- Frontmatter у referenced skill должен быть валиден.
- Install-plan не должен дублировать registry metadata как альтернативный inventory.
- Если registry и source расходятся, source mismatch считается blocking consistency issue.

## Edge cases

- Optional projection layers могут быть короче structured contracts, если не искажают semantics.
- Support artifact может быть syntactically valid, но semantic-invalid, если он drifted from authoritative docs.
- Repo может содержать warnings при полной consistency baseline, если warnings задокументированы и не ломают source-of-truth model.

## Acceptance criteria

- Из документа видно, какие artifact families must stay aligned.
- Consistency rules покрывают docs, schemas, examples, templates, skills, registry и install-plan.
- Naming and ID conventions перечислены явно.
- Документ не оставляет ambiguity about missing refs in mixed-outcome examples.
- Support artifacts явно ограничены и не могут silently rewrite business rules.

## Out of scope

- CI policy implementation.
- Automated diff tools.
- Runtime data reconciliation.
- Binary artifact comparison.
