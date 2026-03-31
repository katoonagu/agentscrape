# 21-skill-contracts-and-activation

## Purpose

Зафиксировать anatomy внутреннего skill, его activation model и bounded interaction с structured artifacts, чтобы internal skills были полезными и traceable, но не превращались в source of truth или в безграничный policy bypass.

## Approved decisions

- Skill состоит из валидного YAML frontmatter и bounded markdown instructions.
- На Stage `7` минимальный frontmatter ограничен полями `name` и `description`.
- Skill не является source of truth.
- Activation должен описываться через конкретные сценарии, а не как broad “use always”.
- Skill output должен быть traceable к artifact context и bounded decision/editable/external-flow/truthfulness rules.
- Skill может ссылаться на structured artifacts, но не подменяет их payload.

## Skill anatomy

- Frontmatter:
  - `name`
  - `description`
- Body:
  - когда skill использовать;
  - когда не использовать;
  - какие входы обязательны;
  - какие проверки выполнить;
  - что skill может предлагать;
  - что skill не имеет права делать;
  - как должен выглядеть bounded output.
- Skill не должен разрастаться до неструктурированного эссе и не должен дублировать все repo docs.

## Activation model

- Skill активируется, когда task соответствует его конкретной project-specific задаче.
- Skill не должен включаться “на всякий случай” без подходящих входов.
- Internal skills должны запускаться только после появления нужных upstream artifacts.
- Если prerequisites отсутствуют, skill должен остановиться, запросить недостающий artifact context или явно сообщить о неполноте входов.

## Skill inputs and outputs

- Входами skill могут быть:
  - `qualification`
  - `decision`
  - `design-seed`
  - `redesign-brief`
  - `demo-build-plan`
  - `preview-manifest`
  - `review-dossier`
  - operator notes / approved references, если они уже нормализованы в structured artifacts.
- Выход skill не заменяет structured artifact и не считается canonical state update сам по себе.
- Если skill формирует рекомендации, они должны быть:
  - bounded;
  - traceable к конкретным источникам;
  - совместимы с уже утвержденными boundaries.

## Required boundaries

Skill обязан уважать:

- decision boundaries;
- editable scope boundaries;
- preserved external flow;
- truthfulness / no fabricated claims;
- разницу между recommended и implemented состоянием.

Skill не может:

- silently расширять page scope;
- silently расширять editable scope;
- переводить кейс в CMS/CRM/app territory;
- подменять внешний flow fake internal flow;
- генерировать утверждения без evidence.

## Evidence requirements

- Если output опирается на факт, он должен иметь artifact-backed source.
- Если evidence недостаточно, skill должен использовать:
  - assumption;
  - placeholder;
  - approval trigger.
- Skill не должен скрывать недостаток evidence за уверенным тоном.

## Interaction with structured artifacts

- Structured artifacts остаются source of truth.
- Skill может помогать:
  - интерпретировать artifact context;
  - предложить bounded next-step output;
  - проверить согласованность уже существующего artifact.
- Skill не должен silently переписывать artifact semantics.

## Failure / misuse cases

- Skill запущен без обязательных upstream artifacts.
- Skill используется для принятия product boundary decision, который уже должен быть зафиксирован в `decision` или `demo-build-plan`.
- Skill начинает выдавать invented facts вместо assumptions/placeholders.
- Skill конфликтует с явным project-specific policy; в этом случае skill behavior считается invalid.

## Acceptance criteria

- Из документа видно, что skill не является source of truth.
- Activation model описан через concrete scenarios.
- Boundaries перечислены явно и совпадают со Stages `0..6`.
- Документ объясняет, как skill работает с structured artifacts без подмены contracts.
- Failure / misuse cases перечислены без двусмысленности.

## Out of scope

- Runtime skill loader behavior.
- CLI parser rules для вызова skill.
- Tool permission model.
- Agent memory / caching internals.
