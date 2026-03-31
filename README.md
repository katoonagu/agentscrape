# agentscrape

`agentscrape` - control plane / planning repository для internal agent pipeline, который обрабатывает website leads: intake, qualification, decisioning по demo-ветке, demo generation orchestration, preview artifact linkage, review dossier preparation, operator-side control workflow и first-party skills source authoring.

Репозиторий не хранит runtime implementation pipeline и не хранит generated builds в git. Здесь фиксируются границы v1, ADR, state machine, decision logic, preset/data layer, generation/review handoff contracts, operator control-plane contracts и authored internal skills для project-specific guidance layer.

Stage `3` зафиксировал preset system + design seed layer. Stage `4` добавил demo generation orchestration layer. Stage `5` зафиксировал preview deployment + review dossier + artifact linkage. Stage `6` добавил operator CLI workflow layer. Stage `7` оформляет first-party skills source layer: repo хранит authored internal skills, а не обязательно installed runtime copies.

## Document index

- [docs/roadmap.md](docs/roadmap.md) - stages `0..8`, current/next статус и roadmap placeholders.
- [docs/tz/00-scope-v1.md](docs/tz/00-scope-v1.md) - границы v1 и подтвержденный scope.
- [docs/tz/01-state-machine.md](docs/tz/01-state-machine.md) - run-level и lead-level state machine.
- [docs/tz/02-entity-model.md](docs/tz/02-entity-model.md) - сущности, ключи и dedupe model.
- [docs/tz/03-qualification-rubric.md](docs/tz/03-qualification-rubric.md) - qualification rubric и score set.
- [docs/tz/04-niche-preset-system.md](docs/tz/04-niche-preset-system.md) - preset data layer и правила выбора niche preset.
- [docs/tz/05-approval-gates.md](docs/tz/05-approval-gates.md) - work modes и human approval logic.
- [docs/tz/06-decision-matrix.md](docs/tz/06-decision-matrix.md) - каноническая decision matrix.
- [docs/tz/07-manifest-contracts.md](docs/tz/07-manifest-contracts.md) - contracts для planning/manifests/control-plane слоя.
- [docs/tz/08-preset-resolution.md](docs/tz/08-preset-resolution.md) - canonical override chain и inheritance rules для preset resolution.
- [docs/tz/09-design-seed-contract.md](docs/tz/09-design-seed-contract.md) - contract для resolved design seed.
- [docs/tz/10-demo-generation-orchestration.md](docs/tz/10-demo-generation-orchestration.md) - generation entry criteria, outputs и hard boundaries.
- [docs/tz/11-redesign-brief-contract.md](docs/tz/11-redesign-brief-contract.md) - contract для redesign brief / `DESIGN.md` handoff.
- [docs/tz/12-demo-build-plan-contract.md](docs/tz/12-demo-build-plan-contract.md) - contract для machine-readable demo build plan.
- [docs/tz/13-preview-deployment-contract.md](docs/tz/13-preview-deployment-contract.md) - preview eligibility, semantics и provider-neutral preview record.
- [docs/tz/14-review-dossier-contract.md](docs/tz/14-review-dossier-contract.md) - dossier modes, evidence model и review source-of-truth rules.
- [docs/tz/15-run-artifact-linkage.md](docs/tz/15-run-artifact-linkage.md) - run-manifest как orchestration index и per-lead artifact linkage.
- [docs/tz/16-cli-operator-workflow.md](docs/tz/16-cli-operator-workflow.md) - CLI-first operator workflow, command families и lifecycle semantics.
- [docs/tz/17-run-request-and-command-model.md](docs/tz/17-run-request-and-command-model.md) - canonical run request и command-model boundaries.
- [docs/tz/18-approval-and-override-contracts.md](docs/tz/18-approval-and-override-contracts.md) - approval/override semantics и policy boundaries.
- [docs/tz/19-operator-audit-log-contract.md](docs/tz/19-operator-audit-log-contract.md) - canonical operator audit trail contract.
- [docs/tz/20-first-party-skill-strategy.md](docs/tz/20-first-party-skill-strategy.md) - стратегия first-party skills и роль repo-authored skills.
- [docs/tz/21-skill-contracts-and-activation.md](docs/tz/21-skill-contracts-and-activation.md) - anatomy, activation model и bounded skill contract.
- [docs/tz/22-skill-interaction-model.md](docs/tz/22-skill-interaction-model.md) - interaction order, non-overlap rules и conflict resolution для internal/external skills.
- [docs/tz/23-skill-source-and-install-layout.md](docs/tz/23-skill-source-and-install-layout.md) - source/install layout и local authoring workflow для project skills.
- [docs/adr/](docs/adr/) - ADR по границам v1, primary entity, generated builds, approval gates, presets, generation boundary, dossier truth model, operator action normalization и first-party skills source model.
- [packages/schemas/](packages/schemas/) - JSON Schema draft-07 и example payloads.
- [packages/schemas/design-seed.schema.json](packages/schemas/design-seed.schema.json) - schema для structured design seed.
- [packages/schemas/redesign-brief.schema.json](packages/schemas/redesign-brief.schema.json) - schema для redesign brief handoff artifact.
- [packages/schemas/demo-build-plan.schema.json](packages/schemas/demo-build-plan.schema.json) - schema для demo build plan.
- [packages/schemas/preview-manifest.schema.json](packages/schemas/preview-manifest.schema.json) - provider-neutral preview artifact record.
- [packages/schemas/review-dossier.schema.json](packages/schemas/review-dossier.schema.json) - structured review dossier source of truth.
- [packages/schemas/run-request.schema.json](packages/schemas/run-request.schema.json) - canonical operator intent artifact.
- [packages/schemas/approval-request.schema.json](packages/schemas/approval-request.schema.json) - structured approval request artifact.
- [packages/schemas/approval-response.schema.json](packages/schemas/approval-response.schema.json) - structured approval response artifact.
- [packages/schemas/operator-override.schema.json](packages/schemas/operator-override.schema.json) - bounded manual override artifact.
- [packages/schemas/operator-audit-log.schema.json](packages/schemas/operator-audit-log.schema.json) - canonical operator/system audit trail schema.
- [packages/schemas/skill-registry.schema.json](packages/schemas/skill-registry.schema.json) - support schema для authored internal skill registry.
- [packages/niche-presets/](packages/niche-presets/) - niche preset data files, global defaults и preset schema.
- [packages/niche-presets/_schema/niche-preset.schema.json](packages/niche-presets/_schema/niche-preset.schema.json) - schema для YAML preset files.
- [packages/skills/](packages/skills/) - authored first-party skill source layer.
- [packages/skills/README.md](packages/skills/README.md) - skill source layer rules, internal skill list и install notes.
- [templates/design-brief/](templates/design-brief/) - human-readable template layer для downstream redesign brief.
- [templates/review-dossier/](templates/review-dossier/) - human-readable projection layer для review dossier.
- [templates/operator-approval/](templates/operator-approval/) - human-readable projection layer для approval request / response artifacts.

## Internal skills source layer

- `packages/skills/` хранит authored internal skills в source-controlled виде.
- Installed runtime copies для Codex/CLI не обязаны жить в repo и могут иметь другой path.
- Repo хранит project-specific rules в docs/contracts/schemas и authored skills, а не в generated install copies.
- Internal skills помогают создавать и проверять structured artifacts, но не заменяют их как source of truth.

## Current repository role

- Канонический источник product/system decisions для Stages `0..7`.
- Источник именованных enum'ов, reason codes, manifest contracts, preset data rules, generation handoff boundaries, preview/review linkage, operator control-plane contracts и authored first-party skills.
- Основа для последующего implementation planning без dashboard, anti-theft, полноценной CMS/CRM логики и provider-specific deploy adapters.
- Источник human-editable preset data, design seed guidance, generation orchestration contracts, preview records, review dossier contracts, operator intent / approval / audit artifacts и project-specific skill source files, но не runtime adapters, не codegen config и не production design system.
