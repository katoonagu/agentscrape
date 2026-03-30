# 09-design-seed-contract

## Purpose

Определить, что такое design seed в `agentscrape`, какие входы его формируют и какой минимальный contract нужен для дальнейшего lead-specific redesign direction и Stage `4` demo generation orchestration.

## Approved decisions

- Design seed - это planning/generation guidance artifact, а не final UI kit и не production design system.
- Design seed собирается из:
  - `global defaults`
  - `primary niche preset`
  - `existing-brand clues`
  - `lead-specific findings`
  - `operator references`
- Один resolved seed всегда имеет ровно один `primaryPresetId`.
- `seedConfidence` - отдельный planning signal (`high | medium | low`), не замена numeric `confidence` из qualification rubric.
- Resolved design seed - canonical upstream input для `demo generation orchestration`, `redesign brief` и `demo build plan`.

## Rules / logic

### What the design seed is

Design seed - это компактный resolved guidance layer, который:

- стабилизирует визуальное и контентное направление;
- сохраняет связь с preset/data layer;
- дает downstream redesign workflow понятный старт без runtime-specific implementation details;
- задает boundary-safe upstream input для generation-eligible handoff artifacts.

### Minimum seed shape

Минимальный состав design seed:

- `seedId`
- `leadKey`
- `primaryPresetId`
- `seedConfidence`
- `sourceSummary`
- `tasteProfile`
- `copyProfile`
- `layoutProfile`
- `visualDirection`
- `paletteDirection`
- `typographyDirection`
- `imageryDirection`
- `preservedConstraints`
- `editableScope`
- `riskFlags`
- `requiresHumanApproval`
- `assumptions`

### Input priority

Приоритет входов:

`global defaults -> niche preset -> existing-brand clues -> lead-specific findings -> operator references`

Этот приоритет должен совпадать с preset resolution layer и не создавать параллельную логику.

### Stable vs lead-specific parts

Стабильные части seed:

- baseline taste defaults;
- default copy posture;
- section/layout bias;
- default visual direction from `global-defaults` + niche preset.

Lead-specific части:

- brand/site clues;
- observed strengths/weaknesses текущего сайта;
- external-flow constraints;
- operator references;
- niche fit confidence и conflict flags.

### `sourceSummary`

`sourceSummary` должен кратко фиксировать:

- какой preset выбран как primary;
- какие override layers были реально применены;
- были ли brand clues достаточно сильны;
- использовались ли operator references;
- какие overrides materially changed final direction.

### Direction fields

Direction fields должны быть structured и short:

- `visualDirection`
- `paletteDirection`
- `typographyDirection`
- `imageryDirection`

Они не должны быть token-heavy prose prompt и не должны описывать production component system.

### Fallback behavior

Если operator references отсутствуют:

- использовать resolved preset + existing site clues + lead findings.

Если у текущего сайта нет внятной visual identity:

- не пытаться копировать визуальный шум;
- усиливать preset-derived direction;
- отметить low brand confidence в `riskFlags` и/или снизить `seedConfidence`.

Если site reality противоречит preset:

- higher-priority observed reality может скорректировать seed;
- при неоднозначности нужен human approval.

### Relationship to downstream redesign direction

- Design seed не заменяет будущий `DESIGN.md` или lead-specific redesign brief.
- Design seed - это upstream normalized input для таких документов.
- `redesign-brief.schema.json` и `demo-build-plan.schema.json` должны ссылаться на resolved design seed, а не дублировать preset resolution.
- Downstream redesign direction может быть более развернутым, но не должен ломать policy Stage `0..4` и resolved constraints из seed.

## Edge cases

- Weak brand, strong business offer: seed может быть stylistically preset-driven, но copy/layout - strongly lead-specific.
- Strong current brand, weak preset fit: seed может использовать preset только как structural baseline, а не как dominant visual direction.
- Multi-fit niche case: `primaryPresetId` не выбирается автоматически без clear winner; seed должен требовать manual resolution.
- External-flow lead: seed может менять visual/copy/layout layer вокруг flow, но не должен трактоваться как разрешение на fake application logic.

## Acceptance criteria

- Документ однозначно отделяет design seed от UI kit и runtime design system.
- Минимальный состав seed перечислен явно.
- Видно, какие inputs стабильные, а какие lead-specific.
- Fallback behavior при отсутствии references или при слабой visual identity зафиксирован без двусмысленности.
- Явно зафиксировано, что resolved design seed становится canonical upstream input для generation handoff artifacts.

## Out of scope

- Final design system token model.
- Runtime prompt assembly.
- Component implementation, theming engine и adapter code.
