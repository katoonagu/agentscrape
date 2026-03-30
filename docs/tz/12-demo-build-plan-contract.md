# 12-demo-build-plan-contract

## Purpose

Определить demo build plan как machine-readable planning artifact, который задает минимальный defensible scope для generation phase и не позволяет generation layer произвольно расширять продуктовые границы.

## Approved decisions

- Demo build plan - machine-readable planning artifact.
- Build plan определяет минимальный scope generation phase, а не implementation details.
- Build plan допускается только для:
  - `DEMO_FRONT_ONLY`
  - `DEMO_EDITABLE_CONTENT`
- Default page scope должен быть ограниченным и defensible.
- Page count не должен расти без evidence.
- One-page leads могут использовать section-based plan вместо multi-page plan.
- Preserved external flow описывается как preserved integration point / preserved booking surface / preserved CTA path.
- Content gaps не должны silently заполняться выдуманными claims.

## Build plan shape

Минимальный состав build plan:

- `buildPlanId`
- `leadKey`
- `decisionType`
- `generationMode`
- `designSeedRef`
- `redesignBriefRef`
- `pagePlan`
- `sectionPlan`
- `contentSources`
- `editableScope`
- `externalFlowHandling`
- `placeholders`
- `approvalRequired`
- `generationReady`
- `stopReasons`
- `assumptions`

## Page plan rules

- Default page plan ограничивается:
  - `home`;
  - до `2` key service pages при наличии evidence из qualification;
  - `contact / booking surface`, если это нужно кейсу.
- Если lead является one-page сайтом, допускается `single-page-sections` plan.
- Каждая planned page должна иметь `sourceBasis`, объясняющий, почему страница разрешена в scope.
- Любое расширение page count beyond obvious baseline требует human approval.

## Section plan rules

- `sectionPlan` должен быть производным от `pagePlan`, а не самостоятельным способом расширить scope.
- Для каждой planned page sections должны быть перечислены явно.
- Section plan не должен молча добавлять sections, которые требуют несуществующего backend behavior.
- Для one-page leads sections становятся основной planning unit, но все равно должны оставаться в рамках qualification evidence и redesign brief.

## Editable content rules

- `editableScope` допускается только для `DEMO_EDITABLE_CONTENT`.
- Allowed editable blocks:
  - `hero`
  - `services`
  - `prices`
  - `team`
  - `reviews`
  - `contacts`
  - `faq`
  - `gallery`
  - `cta`
- `DEMO_FRONT_ONLY` не может содержать editable blocks.
- `DEMO_EDITABLE_CONTENT` не может расширяться за пределы approved editable blocks и не может превращаться в CMS, CRM или fake admin surface.

## External flow handling rules

- Preserved external flow не превращается в fake internal flow.
- Build plan должен описывать внешний flow как:
  - preserved integration point;
  - preserved booking surface;
  - preserved CTA path.
- Build plan может redesign'ить surrounding front layer, но не вправе делать вид, что backend solved.

## Content gaps and placeholders

- Если verified content недостаточно, build plan должен явно отражать gap через `placeholders` и `assumptions`.
- Placeholders не могут маскироваться под verified facts.
- Нельзя выдумывать лицензии, регуляторные claims, врачебные/юридические результаты, отзывы, цены или fake staff identities.
- Материальные content gaps должны поднимать `approvalRequired` или `generationReady = false`.

## Generation readiness criteria

`generationReady = true` допустимо только если одновременно:

- decision type generation-eligible;
- generation mode соответствует decision boundary;
- page plan defensible;
- editable scope не превышен;
- preserved external flow handling не двусмысленен;
- content gaps не ломают минимальный scope.

## Human approval triggers

Human approval обязателен, если:

- unresolved content gaps materially affect scope;
- page plan выходит за obvious defensible scope;
- preserved external flow handling неоднозначен;
- `seedConfidence = low`;
- redesign direction конфликтует с observed site reality;
- `DEMO_EDITABLE_CONTENT` case граничит с medium/high complexity.

## Failure conditions

Build plan должен явно фиксировать failure / stop conditions, если:

- отсутствует generation eligibility;
- отсутствует один из required upstream artifacts;
- editable scope exceeded;
- preserved external flow ambiguous;
- page scope not defensible;
- content gap material;
- seed confidence low и approval не закрыт;
- direction conflicts with site reality.

## Acceptance criteria

- Документ определяет build plan как machine-readable planning artifact, а не runtime config.
- Page plan и section plan rules не позволяют scope creep.
- Editable content rules совпадают с approved editable blocks из Stage `0..2`.
- External flow handling описан как preserved boundary, а не fake implementation.
- Content gaps и readiness criteria фиксируют, когда generation нельзя safely запускать.

## Out of scope

- Runtime build engine.
- Generator-specific prompt templates.
- Deploy provider config.
- Review/PDF implementation.
