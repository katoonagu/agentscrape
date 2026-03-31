# Skills Source Layer

`packages/skills/` хранит authored first-party skills проекта. Это source-controlled слой project-specific guidance для Codex/CLI usage, а не обязательный runtime install path.

## Internal skills

- `atomika-conversion` - bounded conversion/redesign guidance для website demo path.
- `copy-guidelines` - правила service-business copy внутри уже ограниченного scope.
- `qa-review` - review procedure и dossier-safe wording для audit-only и preview-backed cases.

## Authoring rules

- Каждый skill живет в отдельной папке и содержит `SKILL.md`.
- Frontmatter должен быть валидным YAML и на Stage `7` ограничен полями `name` и `description`.
- Skill должен быть bounded, practical и project-specific.
- Skill не должен подменять contracts/docs/schemas как source of truth.
- Skill не должен silently расширять decision boundary, editable scope или preserved external flow boundary.

## Install operationalization notes

- Canonical edits происходят только в repo-authored source files.
- Installed copies не являются canonical edit surface.
- Intended source-to-install discipline описывается в `packages/skills/install-plan.json`.
- Installed copy считается disposable operational copy: если найден drift, canonical fix path - reinstall/re-sync from repo source.

## Registry vs install-plan

- `registry.json` = authored source inventory.
- `install-plan.json` = intended install/sync operationalization.
- Registry не должен подменять install-plan, а install-plan не должен дублировать registry как runtime inventory.

## Install notes

- Repo хранит authored source.
- Installed Codex-facing copies могут жить вне repo.
- Install surface может использовать local copy или symlink, но authoritative authored version остается в repo.
- Generated install copies не должны становиться новым source-of-truth слоем внутри repo.

## Source vs installed

- Source-controlled copy нужна для review, versioning и project-specific policy.
- Installed copy нужна для runtime availability, но path-wise может отличаться.
- Source wins over installed copy in every drift or mismatch case.
