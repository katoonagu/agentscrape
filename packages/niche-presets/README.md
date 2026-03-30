# Niche Presets

Эта папка хранит human-editable preset data для Stage `3`.

## Purpose

- дать reusable baseline для niche-specific redesign direction;
- отделить preset data от runtime implementation;
- обеспечить воспроизводимый input для resolved design seed.

## Files

- `global-defaults.yaml` - neutral baseline для всех leads.
- `beauty-salon.yaml` - starter preset для salon/beauty service websites.
- `dental-clinic.yaml` - starter preset для dentistry websites.
- `legal-services.yaml` - starter preset для legal service websites.
- `_schema/niche-preset.schema.json` - schema для всех preset YAML files.

## Authoring rules

- preset - это data, а не prose prompt;
- preset files должны оставаться human-editable;
- values должны быть short, structured и practical;
- preset не должен содержать runtime implementation details, component APIs, deployment data или generated code assumptions;
- preset не может нарушать policy Stage `0..2`.

## Resolution order

Канонический override chain:

`global defaults -> niche preset -> existing-brand override -> lead override -> operator manual override`

Подробности описаны в:

- `docs/tz/04-niche-preset-system.md`
- `docs/tz/08-preset-resolution.md`
- `docs/tz/09-design-seed-contract.md`

## Global defaults vs niche presets

- `global-defaults.yaml` не выбирает нишу и не должен конкурировать с niche preset.
- niche preset добавляет domain-specific bias, signals, layout defaults и design direction.
- если clear niche fit отсутствует, fallback идет к `global-defaults` + lead/site findings, а не к искусственному multi-preset blend.
