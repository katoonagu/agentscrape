# Title

ADR-003: Generated builds live outside the repository

## Status

Accepted

## Context

Demo generation и preview deployment потенциально produce large and volatile build outputs. Если хранить generated builds в этом репозитории, planning repo смешивается с artifact storage, git history быстро загрязняется, а control-plane contracts начинают зависеть от implementation/runtime details.

## Decision

- Generated builds не хранятся в git-репозитории `agentscrape`.
- Preview outputs живут как внешние preview deployments или внешние artifacts.
- Репозиторий хранит только manifests, contracts, docs и ссылки на внешние outputs.
- `PreviewManifest` должен явно моделировать external location и не должен предполагать in-repo build path.

## Consequences

- Репозиторий остается planning/control-plane source of truth.
- Preview deployment можно менять независимо от структуры репозитория.
- Implementation обязан хранить только references/URIs на build outputs, а не сами build trees.

## Rejected alternatives

- Коммитить generated source/build outputs в репозиторий.
- Хранить preview artifacts под `apps/`, `templates/` или аналогичными git-tracked директориями.
- Делать generated builds частью canonical project structure в `v1`.
