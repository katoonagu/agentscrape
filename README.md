# agentscrape

`agentscrape` - control plane / planning repository для internal agent pipeline, который обрабатывает website leads: intake, qualification, decisioning по demo-ветке, demo generation orchestration, preview manifesting и review/report preparation.

Репозиторий не хранит продуктовую реализацию pipeline и не хранит generated builds в git. Здесь фиксируются границы v1, ADR, state machine, decision logic, preset/data layer и JSON Schema для planning/manifests слоя.

Stage `3` зафиксировал preset system + design seed layer. Stage `4` добавляет demo generation orchestration layer: он определяет, как generation-eligible decision, resolved design seed, redesign brief и demo build plan соединяются без расширения decision boundary, editable scope и preserved external flow boundary.

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
- [docs/tz/10-demo-generation-orchestration.md](docs/tz/10-demo-generation-orchestration.md) - generation entry criteria, outputs и hard boundaries.
- [docs/tz/11-redesign-brief-contract.md](docs/tz/11-redesign-brief-contract.md) - contract для redesign brief / `DESIGN.md` handoff.
- [docs/tz/12-demo-build-plan-contract.md](docs/tz/12-demo-build-plan-contract.md) - contract для machine-readable demo build plan.
- [docs/adr/](docs/adr/) - ADR по границам v1, primary entity, generated builds, approval gates, presets и generation boundary.
- [packages/schemas/](packages/schemas/) - JSON Schema draft-07 и example payloads.
- [packages/schemas/design-seed.schema.json](packages/schemas/design-seed.schema.json) - schema для structured design seed.
- [packages/schemas/redesign-brief.schema.json](packages/schemas/redesign-brief.schema.json) - schema для redesign brief handoff artifact.
- [packages/schemas/demo-build-plan.schema.json](packages/schemas/demo-build-plan.schema.json) - schema для demo build plan.
- [packages/niche-presets/](packages/niche-presets/) - niche preset data files, global defaults и preset schema.
- [packages/niche-presets/_schema/niche-preset.schema.json](packages/niche-presets/_schema/niche-preset.schema.json) - schema для YAML preset files.
- [templates/design-brief/](templates/design-brief/) - human-readable template layer для downstream redesign brief.

## Current repository role

- Канонический источник product/system decisions для Stages `0..4`.
- Источник именованных enum'ов, reason codes, manifest contracts, preset data rules и generation handoff boundaries.
- Основа для последующего implementation planning без dashboard, anti-theft и полноценной CMS/CRM логики.
- Источник human-editable preset data, design seed guidance и generation orchestration contracts, но не runtime adapters, не codegen config и не production design system.
