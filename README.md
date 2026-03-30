# agentscrape

`agentscrape` - control plane / planning repository для internal agent pipeline, который обрабатывает website leads: intake, qualification, decisioning по demo-ветке, preview manifesting и review/report preparation.

Репозиторий не хранит продуктовую реализацию pipeline и не хранит generated builds в git. Здесь фиксируются границы v1, ADR, state machine, decision logic и JSON Schema для planning/manifests слоя.

## Document index

- [docs/roadmap.md](docs/roadmap.md) - stages `0..7`, current/next статус и roadmap placeholders.
- [docs/tz/00-scope-v1.md](docs/tz/00-scope-v1.md) - границы v1 и подтвержденный scope.
- [docs/tz/01-state-machine.md](docs/tz/01-state-machine.md) - run-level и lead-level state machine.
- [docs/tz/02-entity-model.md](docs/tz/02-entity-model.md) - сущности, ключи и dedupe model.
- [docs/tz/03-qualification-rubric.md](docs/tz/03-qualification-rubric.md) - qualification rubric и score set.
- [docs/tz/04-niche-preset-system.md](docs/tz/04-niche-preset-system.md) - draft skeleton для preset system следующего stage.
- [docs/tz/05-approval-gates.md](docs/tz/05-approval-gates.md) - work modes и human approval logic.
- [docs/tz/06-decision-matrix.md](docs/tz/06-decision-matrix.md) - каноническая decision matrix.
- [docs/tz/07-manifest-contracts.md](docs/tz/07-manifest-contracts.md) - contracts для planning/manifests слоя.
- [docs/adr/](docs/adr/) - ADR по границам v1, primary entity, generated builds и approval gates.
- [packages/schemas/](packages/schemas/) - JSON Schema draft-07 и example payloads.

## Current repository role

- Канонический источник product/system decisions для Stages `0..2`.
- Источник именованных enum'ов, reason codes и manifest contracts.
- Основа для последующего implementation planning без dashboard, anti-theft и полноценной CMS/CRM логики.
