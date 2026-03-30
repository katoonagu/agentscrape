# Title

ADR-005: Presets as a data layer

## Status

Accepted

## Context

После Stage `0..2` у проекта есть qualification, decision logic и manifest contracts, но нет формализованного слоя данных, который задает нишевые defaults и собирает reproducible design direction для конкретного lead. Без такого слоя redesign direction либо уходит в ad-hoc prose instructions, либо становится слишком зависимой от runtime implementation choices.

## Decision

- Presets оформляются как human-editable data layer.
- Preset files хранятся отдельно от runtime implementation и описываются schema-driven YAML contract.
- `global-defaults` и niche preset files используются как structured input для resolved design seed.
- Design seed считается downstream planning artifact, а не final UI kit и не runtime adapter config.
- Preset layer не может override policy boundaries Stage `0..2`.

## Consequences

- Niche defaults становятся reviewable, versionable и ручно редактируемыми.
- Subsequent redesign workflow получает один reproducible source of direction вместо свободной prose-логики.
- Runtime implementation later сможет читать preset layer как stable data contract, а не как loosely structured notes.

## Rejected alternatives

- Хранить preset logic только в prose docs.
- Кодировать niche defaults сразу в runtime implementation.
- Использовать длинные prompts вместо structured preset data.
- Разрешить preset layer менять product policy и decision constraints Stage `0..2`.
