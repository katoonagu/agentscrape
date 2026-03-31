# 22-skill-interaction-model

## Purpose

Зафиксировать, как internal skills соотносятся друг с другом и с external skill dependencies, чтобы project-specific behaviors не дублировались, не конфликтовали и не размывали already approved boundaries.

## Approved decisions

- Internal skill set на Stage `7`:
  - `atomika-conversion`
  - `copy-guidelines`
  - `qa-review`
- External skills используются дополнительно, но не заменяют internal rules.
- Не допускается silent overlap, где два skills принимают разные policy decisions по одному и тому же boundary.
- При конфликте internal и external skill приоритет у project-specific internal boundary.
- `copy-guidelines` не принимает product/architecture decisions.
- `qa-review` не изобретает implemented facts.
- `atomika-conversion` не расширяет scope без явного artifact-backed основания.

## Internal skill set

### `atomika-conversion`

- Работает после появления structured upstream inputs.
- Помогает переводить qualification/decision/seed/brief в bounded redesign direction.
- Не принимает authority over policy boundaries.

### `copy-guidelines`

- Работает после того, как scope и direction уже ограничены.
- Помогает формулировать service-business copy внутри уже утвержденных границ.
- Не решает page planning, architecture или product boundary вопросы.

### `qa-review`

- Работает после audit evidence или preview-backed evidence.
- Помогает фиксировать before/after findings и dossier-safe wording.
- Не доказывает implemented changes без evidence.

## External skill dependencies

- Допустимы generic design, research, copy, review или tooling skills.
- External skill может дополнять workflow, если он не отменяет repo policy.
- Внешний skill рассматривается как supplementary helper, а не как authority по project-specific rules.

## Interaction order

1. `atomika-conversion` после `qualification`, `decision`, `design-seed` и, где применимо, `redesign-brief`.
2. `copy-guidelines` после того, как redesign direction и scope уже bounded.
3. `qa-review` после появления audit evidence или preview-backed evidence и при подготовке review output.

Если задача не дошла до соответствующей стадии, более поздний skill не должен подменять отсутствующие upstream artifacts.

## Non-overlap rules

- Conversion skill определяет не copy style, а bounded direction и scope-safe conversion emphasis.
- Copy skill определяет wording rules внутри существующего scope, но не page architecture.
- QA skill анализирует evidence-backed findings, но не формирует generation scope.
- Один skill не должен silently выполнять работу другого skill, если это меняет policy meaning.

## Conflict resolution

- Сначала применяется explicit contract/docs/schema boundary.
- Затем применяется repo-authored internal skill rule.
- External skill может использоваться только если он не противоречит первым двум уровням.
- При сохраняющемся конфликте safe path - downgrade, assumption или operator approval trigger, а не silent override.

## Edge cases

- External copy/design skill предлагает решения, которые выходят за approved editable scope: internal boundary wins, external suggestion не принимается.
- QA skill видит preview без достаточного evidence: findings формулируются как limited / observed / partial, а не как universal improvement claim.
- Conversion skill пытается закрыть отсутствующий source material выдуманным контентом: это invalid use, нужно перейти к placeholder / assumption / approval trigger.
- Одна задача может требовать несколько skills, но interaction order все равно должен сохранять traceability.

## Acceptance criteria

- Internal skill set перечислен явно.
- Interaction order описан без двусмысленности.
- Non-overlap rules исключают silent policy conflicts.
- Конфликт internal vs external skill решается в пользу repo-authored project boundary.
- Из документа видно, что copy и QA skills не подменяют conversion/policy decisions.

## Out of scope

- Runtime orchestration engine для chaining skills.
- Automatic tool routing.
- External skill installation mechanics.
- Skill marketplace governance.
