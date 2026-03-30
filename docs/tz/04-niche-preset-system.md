# 04-niche-preset-system

## Purpose

Зафиксировать skeleton для следующего stage, в котором niche presets станут входом для demo shaping и content framing, но не детализировать preset runtime раньше времени.

## Approved decisions

- Стартовые preset'ы для library:
  - `beauty-salon`
  - `dental-clinic`
  - `legal-services`
- В текущем проходе preset system документируется как draft skeleton, а не как fully specified runtime subsystem.
- Preset system должен поддерживать website-oriented workflow, а не general app generation.
- Assumption: пустые preset YAML в `packages/niche-presets/` остаются незаполненными до следующего stage.

## Rules / logic

- Preset должен быть привязан к niche-specific assumptions о:
  - типовых service blocks;
  - характерных CTA;
  - допустимых content sections;
  - expected external flows, если они типичны для ниши.
- Preset не отменяет qualification rubric и не подменяет decision matrix.
- Preset используется только после того, как lead признан buildable.
- Каноническое место preset files: `packages/niche-presets/`.
- Нужна отдельная schema/contract проработка preset payload, но она не входит в текущий stage.

## Edge cases

- Один lead может частично подходить сразу под несколько ниш; в текущем stage это unresolved item и требует human selection позже.
- Если ниша неизвестна, pipeline не должен блокироваться; preset может быть отсутствующим.
- External flow cases могут требовать niche-aware front-layer treatment, но не кастомную app logic симуляцию.

## Acceptance criteria

- Документ фиксирует стартовые presets и их роль без преждевременной детализации.
- Видно, что preset system идет после qualification/decision, а не до них.
- Ясно, что заполнение preset YAML и их schema - задача следующего stage.

## Out of scope

- Финальная preset schema.
- Реальное наполнение preset YAML.
- Prompt templates, generation recipes и design token libraries.
