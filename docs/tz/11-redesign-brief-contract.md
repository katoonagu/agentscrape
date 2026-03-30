# 11-redesign-brief-contract

## Purpose

Определить redesign brief как handoff artifact между planning layer и generation phase, чтобы downstream generation получал короткий, структурированный и reviewable contract вместо ad-hoc prose или runtime prompt dump.

## Approved decisions

- Redesign brief строится из:
  - qualification result;
  - decision result;
  - resolved design seed;
  - preset-derived direction;
  - observed site constraints.
- Brief обязан явно отражать:
  - problem summary;
  - redesign goals;
  - preserved constraints;
  - external flow handling;
  - editable scope;
  - page plan;
  - section plan;
  - copy direction;
  - visual direction;
  - non-goals;
  - assumptions.
- Brief не является runtime prompt dump.
- Brief не является кодом.
- Brief не является production design system.

## Minimum brief structure

Минимальный состав brief:

- `briefId`
- `leadKey`
- `decisionType`
- `designSeedRef`
- `problemSummary`
- `redesignGoals`
- `preservedConstraints`
- `externalFlowHandling`
- `editableScope`
- `pagePlanSummary`
- `sectionPlan`
- `copyDirection`
- `visualDirection`
- `nonGoals`
- `assumptions`
- `approvalRequired`

## Human-readable vs structured parts

- `redesign-brief.schema.json` - canonical machine-readable form brief contract.
- `templates/design-brief/DESIGN.template.md` - human-readable projection того же brief.
- Markdown projection не должна добавлять новые решения, которых нет в structured brief.
- Если между Markdown и structured brief есть расхождение, structured brief и upstream source artifacts имеют приоритет.

## Required sections

Каждый brief должен содержать разделы со следующими функциями:

- `Lead / decision context` - кто lead и какая decision branch разрешает generation;
- `Problem summary` - что именно в текущем сайте мешает defensible redesign outcome;
- `Redesign goals` - чего должен добиться demo в пределах approved scope;
- `Preserved constraints` - что нельзя нарушать;
- `External flow handling` - как трактуется preserved external flow;
- `Editable scope` - какие blocks editable и разрешены ли они вообще;
- `Page plan` - минимальный planned page scope;
- `Section plan` - ключевые sections по страницам или одной странице;
- `Copy direction` - тон, CTA posture и messaging bias;
- `Visual direction` - short structured direction без превращения в full design system;
- `Non-goals` - что demo намеренно не решает;
- `Assumptions` - какие gaps или inferred constraints остаются открытыми.

## Source-of-truth hierarchy

Source-of-truth hierarchy для brief:

1. decision result;
2. resolved design seed;
3. qualification findings;
4. preset-derived direction;
5. observed site constraints;
6. operator-approved notes.

Interpretation rule:

- нижестоящий слой не может ломать boundary, заданную вышестоящим слоем;
- operator-approved notes могут уточнять brief, но не расширяют decision boundary, editable scope и preserved external flow policy.

## Constraints that must be carried through

Brief обязан без потерь переносить в generation phase:

- exact `decisionType` и допустимый generation mode;
- preserved external flow boundary;
- editable scope boundary;
- default page scope и section plan;
- verified content limits и content gaps;
- explicit non-goals, чтобы generation не достраивал scope молча.

## Edge cases

- `DEMO_FRONT_ONLY` lead: `editableScope` должен быть явно пустым, а brief не должен намекать на editable CMS behavior.
- One-page lead: `pagePlanSummary` может указывать single-page structure, а `sectionPlan` становится primary planning unit.
- Low `seedConfidence`: brief может существовать как approval-seeking artifact, но должен это явно отражать.
- Ambiguous external flow: brief не должен делать вид, что integration solved; он должен описывать preserved CTA path или preserved booking surface.

## Acceptance criteria

- Документ однозначно определяет brief как handoff artifact между planning и generation.
- Required sections перечислены явно и покрывают все approved constraints.
- Source-of-truth hierarchy фиксирует, какие upstream artifacts важнее.
- Human-readable template layer отделен от structured source of truth.
- Brief не превращается в runtime prompt dump или production design system.

## Out of scope

- Prompt engineering для конкретного generator.
- Runtime brief renderer и adapter code.
- Final UI implementation details.
- Preview review dossier formatting.
