# 23-skill-source-and-install-layout

## Purpose

Зафиксировать distinction между authored skill source в repo и installed Codex-facing copies, чтобы `packages/skills/` рассматривался как source-controlled authoring layer, а не как обязательный runtime install path.

## Approved decisions

- Authored source lives in `packages/skills/`.
- Installed Codex-facing project skills are a separate install surface.
- Source-controlled repo copy и installed copy не обязаны совпадать path-wise.
- Conceptual install modes могут быть `copy` или `symlink`, но repo хранит source-of-truth authored skills.
- Project-specific skills должны быть installable from local source.

## Source layout

- `packages/skills/README.md` описывает общие authoring rules.
- Каждый internal skill живет в собственной папке:
  - `packages/skills/atomika-conversion/`
  - `packages/skills/copy-guidelines/`
  - `packages/skills/qa-review/`
- Source-controlled inventory описывается через `packages/skills/registry.json` и `packages/schemas/skill-registry.schema.json`.
- Repo layout ориентирован на reviewability, а не на runtime discovery internals.

## Install layout

- Installed copies могут жить в agent-specific install paths вне repo.
- Install surface может использовать:
  - local copy;
  - symlink;
  - другой local development path.
- Repo не обязан хранить эти installed copies, если authored source уже доступен и installable.

## Versioning and update model

- Authoritative revision internal skill определяется git history repo.
- Обновление skill должно сопровождаться update source file и, при необходимости, registry/docs references.
- Installed copy может временно отставать от source-controlled версии; это operational concern, а не повод менять authored truth model.

## Local authoring workflow

1. Изменить source files в `packages/skills/`.
2. Проверить frontmatter и bounded instructions.
3. При существенных изменениях обновить `registry.json` и связанные docs.
4. После review использовать локальный install path как отдельный operational step.

## Edge cases

- Repo может содержать authored source без немедленной installed copy.
- Installed path может отличаться на разных машинах; repo не должен кодировать machine-specific absolute paths.
- Temporary local install via symlink допустим conceptually, но не делает symlink source of truth.
- Generated install copies не должны коммититься обратно в repo как новый authoritative layer.

## Acceptance criteria

- Из документа ясно, где лежит authored source.
- Install surface явно отделена от repo source layer.
- Versioning model опирается на repo history, а не на installed copies.
- Local authoring workflow описан без runtime installer implementation.
- Документ не подменяет source-controlled skills install copies.

## Out of scope

- Actual installer scripts.
- Per-machine path discovery.
- Runtime loader implementation.
- Cross-machine sync automation.
