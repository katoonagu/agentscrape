# agentscrape

`agentscrape` - control plane / planning repository для internal agent pipeline, который обрабатывает website leads: intake, qualification, decisioning по demo-ветке, preview manifesting и review/report preparation.

Репозиторий не хранит продуктовую реализацию pipeline и не хранит generated builds в git. Здесь фиксируются границы v1, ADR, state machine, decision logic и JSON Schema для planning/manifests слоя.

Отдельный слой Stage `3` - preset system + design seed layer. Он описывает, как из глобальных defaults, niche preset, brand/site clues, lead-specific findings и operator inputs получается resolved design seed для следующего redesign workflow.

## Document index

- [docs/roadmap.md](docs/roadmap.md) - stages `0..7`, current/next статус и roadmap placeholders.
- [docs/tz/00-scope-v1.md](docs/tz/00-scope-v1.md) - границы v1 и подтвержденный scope.
- [docs/tz/01-state-machine.md](docs/tz/01-state-machine.md) - run-level и lead-level state machine.
- [docs/tz/02-entity-model.md](docs/tz/02-entity-model.md) - сущности, ключи и dedupe model.
- [docs/tz/03-qualification-rubric.md](docs/tz/03-qualification-rubric.md) - qualification rubric и score set.
- [docs/tz/04-niche-preset-system.md](docs/tz/04-niche-preset-system.md) - preset data layer и правила выбора niche preset.
- [docs/tz/05-approval-gates.md](docs/tz/05-approval-gates.md) - work modes и human approval logic.
- [docs/tz/06-decision-matrix.md](docs/tz/06-decision-matrix.md) - каноническая decision matrix.
- [docs/tz/07-manifest-contracts.md](docs/tz/07-manifest-contracts.md) - contracts для planning/manifests слоя.
- [docs/tz/08-preset-resolution.md](docs/tz/08-preset-resolution.md) - canonical override chain и inheritance rules для preset resolution.
- [docs/tz/09-design-seed-contract.md](docs/tz/09-design-seed-contract.md) - contract для resolved design seed.
- [docs/adr/](docs/adr/) - ADR по границам v1, primary entity, generated builds, approval gates и preset data layer.
- [packages/schemas/](packages/schemas/) - JSON Schema draft-07 и example payloads.
- [packages/niche-presets/](packages/niche-presets/) - niche preset data files, global defaults и preset schema.
- [packages/niche-presets/_schema/niche-preset.schema.json](packages/niche-presets/_schema/niche-preset.schema.json) - schema для YAML preset files.

## Current repository role

- Канонический источник product/system decisions для Stages `0..3`.
- Источник именованных enum'ов, reason codes, manifest contracts и preset data rules.
- Основа для последующего implementation planning без dashboard, anti-theft и полноценной CMS/CRM логики.
- Источник human-editable preset data и design seed guidance, но не runtime adapters и не production design system.
