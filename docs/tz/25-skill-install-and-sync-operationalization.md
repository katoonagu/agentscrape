# 25-skill-install-and-sync-operationalization

## Purpose

Зафиксировать source-to-install discipline для first-party skills, чтобы authored source, registry и intended install plan оставались согласованными, а installed copies не становились скрытым альтернативным source of truth.

## Approved decisions

- Repo-authored source in `packages/skills/` является source of truth.
- Installed skill copy является operational copy only.
- Registry и install-plan не совпадают по назначению.
- Install-plan не является runtime state.
- Edit-in-installed-copy запрещен как canonical workflow.
- Repo не обязан хранить installed copies.

## Source-of-truth model

- Source of truth для internal skills:
  - authored `SKILL.md` files;
  - `packages/skills/registry.json`;
  - supporting docs in `docs/tz/20..23`.
- Operational install artifacts существуют только для discipline и verification, а не для переопределения source.

## Install surfaces

- `project-local` Codex-facing surface.
- `user-local` Codex-facing surface.
- Surface выбирается operationally, но не меняет authored truth model.

## Install/sync lifecycle

1. Выбрать authored source revision из repo.
2. Derive or review install plan.
3. Install via `copy` или `symlink`.
4. Verify installed copy against source/registry/install-plan.
5. При обновлении source выполнить re-sync.

## Drift handling

- Installed edits считаются disposable.
- Если source и installed copy расходятся, canonical policy:
  - принять repo source как authoritative;
  - discard installed copy;
  - reinstall/re-sync from source.
- Drift не должен silently жить как альтернативная рабочая версия skill.

## Verification after install

- Проверить, что installed copy соответствует intended `skillId` и `sourcePath`.
- Проверить, что frontmatter и high-level body identity не расходятся с repo source.
- Проверить, что install surface не добавляет неотслеживаемые generated skill variants.
- Проверить, что registry и install-plan остаются согласованными.

## Failure / recovery rules

- Missing installed copy: reinstall from source.
- Drifted installed copy: discard and reinstall/re-sync.
- Registry/install-plan mismatch: fix source metadata first, потом reinstall if needed.
- Broken verification after install: treat as blocking operational issue, not as justification to edit installed copy manually.

## Edge cases

- Разные developers могут использовать разные install surfaces; authoritative source все равно один.
- Symlink-based install допустим, но не отменяет requirement на verification.
- Repo может временно не иметь активной installed copy и оставаться valid как authored source layer.
- Install operationalization не превращается в plugin manager, version resolver или machine-state registry.

## Acceptance criteria

- Из документа ясно, что authored source wins.
- Registry и install-plan разведены по ролям.
- Installed copy описан как disposable operational copy.
- Drift policy ведет к reinstall/re-sync, а не к manual edit installed copy.
- Install lifecycle описан без runtime installer implementation.

## Out of scope

- Installer scripts.
- Runtime skill loaders.
- Machine-state discovery.
- Package-manager behavior.
