# 27-stage-0-8-acceptance-checklist

## Purpose

Зафиксировать финальный acceptance checklist planning phase после Stages `0..8`, чтобы repo можно было формально вывести в verification и перейти к выбору первого implementation slice без новых docs-only stages.

## Approved decisions

- Это финальный acceptance checklist planning phase.
- После этого документа repo должен идти в verification, а не в новые docs stages.
- Checklist покрывает:
  - stage coverage;
  - schema/example integrity;
  - artifact linkage integrity;
  - skills source integrity;
  - install-plan clarity;
  - template consistency;
  - no-silent-boundary-expansion compliance;
  - auditability and truthfulness safeguards.

## Checklist categories

- `stage-coverage`
- `schema-example-integrity`
- `artifact-linkage-integrity`
- `skills-source-integrity`
- `install-plan-clarity`
- `template-consistency`
- `no-silent-boundary-expansion`
- `auditability-and-truthfulness`

## Blocking acceptance items

- Missing stage coverage for authoritative planning surface.
- Any schema/example mismatch.
- Broken artifact linkage in canonical examples.
- Missing or invalid internal skill source referenced by registry/install-plan.
- Template contradiction with canonical structured contract.
- Любой artifact, который silently расширяет approved policy boundaries.
- Любая ambiguity, которая делает handoff к verification materially unclear.

## Non-blocking observations

- Tooling gaps around optional format checks.
- Readability refinements that do not affect contracts.
- Projection-layer improvements that do not affect source-of-truth semantics.
- Operational notes, которые стоит учесть при verification, но не блокируют его старт.

## Exit criteria for planning phase

- Все blocking acceptance items закрыты.
- Remaining warnings задокументированы, а не скрыты.
- README, roadmap, TZ, ADR, schemas, examples, templates, skills, registry и install-plan согласованы enough for repo-wide review.
- Repo готов к предметной verification pass и выбору первого implementation slice.

## Handoff to verification

- Сначала проводится repo-wide verification.
- Затем фиксируются blocking findings и warnings.
- После verification выбирается first implementation slice.
- Новый docs-only planning stage не создается без явного пересмотра overall planning model.

## Edge cases

- Repo может выйти из planning phase как `ready-with-warnings`, если warnings явно документированы и не ломают exit criteria.
- Один blocking issue в support layer может блокировать handoff, даже если core docs уже стабильны.
- Verification может выявить необходимость точечных fixes, но это не означает автоматического создания Stage `9`.

## Acceptance criteria

- Из документа ясно, что он завершает planning phase.
- Checklist categories и blocking items перечислены явно.
- Exit criteria отделены от runtime readiness.
- Handoff to verification описан без двусмысленности.
- Документ закрепляет stop rule against endless planning expansion.

## Out of scope

- Runtime implementation backlog prioritization beyond first slice selection.
- CI dashboards.
- Production rollout planning.
- Performance benchmarking.
