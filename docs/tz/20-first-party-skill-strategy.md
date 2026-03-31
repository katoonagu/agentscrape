# 20-first-party-skill-strategy

## Purpose

Зафиксировать, зачем проекту нужен first-party skills source layer, какую роль играет `packages/skills/` и почему internal skills должны храниться как source-controlled project assets, а не растворяться во внешних dependencies или в runtime install paths.

## Approved decisions

- `packages/skills/` является authored source layer для project-specific internal skills.
- Installed runtime skill paths не обязаны жить в repo.
- Internal skills не заменяют contracts/docs/schemas и не становятся source of truth.
- Internal skills должны быть version-controlled, reviewable и human-editable.
- External skills допустимы как dependencies, но project-specific policy и boundary logic должны жить в repo-authored skills и docs.
- Repo хранит authored source of truth для internal skills, а не generated install copies.

## Why internal skills exist in this repo

- Проекту нужны повторяемые project-specific instructions поверх общих agent capabilities.
- Часть правил не должна зависеть только от длинных prompt'ов в сессии или от внешних skills, потому что они определяют product boundaries и review discipline.
- Internal skills позволяют держать в одном месте:
  - project-specific conversion guidance;
  - service-business copy rules;
  - dossier-safe review procedure.
- Internal skills делают эти правила reviewable как обычные source files и позволяют менять их через обычный repo workflow.

## Source-vs-installed model

- Repo хранит authored source files skill'ов.
- Runtime-installed copies для Codex/CLI являются отдельной install surface.
- Path installed copy может не совпадать с repo path authored source.
- Repo не обязан хранить текущие installed copies, если authored source уже version-controlled и installable from local source.

## Internal vs external skill roles

- Internal skills покрывают project-specific policy, bounded workflows и wording rules.
- External skills могут закрывать generic capabilities: design references, general copy heuristics, tooling workflows.
- Если возникает конфликт между external behavior и project-specific boundary, приоритет у repo-authored internal rules.
- External skill не должен silently переопределять internal boundary logic.

## Skill lifecycle

1. Skill authoring в `packages/skills/`.
2. Review как обычного repo source.
3. Обновление registry и linked docs при существенных изменениях.
4. Концептуальная local install / sync во внешнюю Codex-facing install surface.
5. Дальнейшая итерация на основе реального использования, но без потери authored source of truth.

## Edge cases

- Repo может временно содержать authored skill source без актуальной installed copy; это не делает source invalid.
- Installed copy может отставать от source-controlled версии; authoritative version все равно остается в repo.
- External skill может покрывать похожую тему, но не заменяет internal skill, если тема содержит project-specific boundaries.
- Если skill устарел, он должен быть помечен через registry status, а не silently удален из policy surface.

## Acceptance criteria

- Из документа ясно, зачем internal skills существуют в repo.
- Source-vs-installed distinction описан явно.
- Internal skills описаны как version-controlled и human-editable.
- External dependencies допускаются, но project-specific rules остаются в repo.
- Не возникает впечатления, что skills заменяют contracts или schemas.

## Out of scope

- Runtime installer scripts.
- Agent-specific install path automation.
- Plugin marketplace / plugin manager behavior.
- Runtime worker logic и tool adapters.
