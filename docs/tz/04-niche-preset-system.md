# 04-niche-preset-system

## Purpose

Зафиксировать рабочую спецификацию preset system как human-editable data layer, который задает consistent redesign bias и design seed defaults для buildable website leads.

## Approved decisions

- Стартовые preset'ы для library:
  - `beauty-salon`
  - `dental-clinic`
  - `legal-services`
- `global-defaults` существует как общий baseline для всех ниш.
- Preset - это data, а не prose prompt.
- Presets должны быть human-editable.
- Presets должны быть достаточно конкретными для consistent redesign direction, но не должны быть overfitted под один lead.
- Preset system должен поддерживать website-oriented workflow, а не general app generation.
- Preset не хранит runtime implementation details.
- Assumption: preset resolution формирует planning artifact, а не final UI kit и не runtime-specific config.

## Preset goals

- Дать reproducible стартовую direction для redesign workflow.
- Снизить произвольность между похожими leads внутри одной ниши.
- Сохранить ручную редактируемость и reviewability preset layer.
- Не превращать preset в скрытый runtime adapter или в длинный prompt blob.

## Data model of preset

Каждый preset file должен описывать минимум:

- `id`
- `label`
- `version`
- `status`
- `applicability`
- `taste`
- `copy`
- `layout`
- `qualification`
- `editingScope`
- `designSeed`
- `approvalHints`

Смысл разделов:

- `applicability` - почему preset подходит или не подходит lead.
- `taste` - controllable style intensity knobs.
- `copy` - content/voice defaults.
- `layout` - section presence и ordering bias.
- `qualification` - niche-level bias, который не ломает Stage `0..2` policy.
- `editingScope` - какие editable blocks допустимы в пределах уже утвержденного `DEMO_EDITABLE_CONTENT`.
- `designSeed` - short structured directions для visual/brand treatment.
- `approvalHints` - когда preset нельзя применять автоматически.

## Inheritance model

- Preset resolution использует layered inheritance, а не flat one-shot replacement.
- Канонический baseline - `global-defaults`.
- Niche preset поверх baseline вводит domain-specific defaults.
- Existing-brand/site clues и lead findings уточняют resolved direction.
- Operator manual override всегда имеет наивысший приоритет.

## Override order

Канонический override chain:

`global defaults -> niche preset -> existing-brand override -> lead override -> operator manual override`

Полные правила merge/replace описываются в [08-preset-resolution.md](./08-preset-resolution.md). В этом документе preset system фиксирует только саму иерархию и intent.

## Preset selection rules

- Автоматически применяется только один primary preset.
- Preset selection опирается на:
  - positive/negative signals в `applicability`;
  - типовые offers и site clues;
  - qualification findings;
  - operator-provided references, если они есть.
- `global-defaults` не должен фильтровать нишу; он служит только neutral baseline.
- Preset не отменяет qualification rubric и не подменяет decision matrix.
- Preset применяется только после того, как lead достиг stable qualification/decision context.

## Multi-fit and low-confidence handling

- Если lead одновременно похож на несколько ниш и нет clear primary fit, preset resolution должен маркировать case как multi-fit.
- Multi-fit case не должен автоматически применять несколько presets с равным весом.
- Default безопасный путь - выбрать один primary preset только при явном лидере; иначе требовать human approval.
- Если confidence в preset selection низкий, resolved design seed должен это отражать отдельно от numeric `confidence` qualification rubric.

## Edge cases

- Один lead может частично подходить сразу под несколько ниш; такой case не должен автоматически собирать composite preset без явного policy.
- Если ниша неизвестна, pipeline не должен блокироваться; fallback идет к `global-defaults` + lead/site findings.
- Если у текущего сайта нет внятной visual identity, preset должен усиливать свою design direction, а не копировать слабые brand clues.
- External flow cases могут требовать niche-aware front-layer treatment, но не кастомную app logic симуляцию.
- Operator references могут конфликтовать с preset; в этом случае higher-priority override должен иметь преимущество.

## Acceptance criteria

- Документ фиксирует preset как data layer, а не как prompt prose.
- Из документа понятно, как preset выбирается, наследуется и ограничивается policy Stage `0..2`.
- Явно зафиксировано, что preset layer human-editable и non-runtime.
- Документ согласован с `03-qualification-rubric`, `05-approval-gates`, `06-decision-matrix` и `07-manifest-contracts`.

## Out of scope

- Runtime adapters, которые потребляют preset files.
- Final UI kit / production design system.
- Prompt templates, component code и generation implementation.
