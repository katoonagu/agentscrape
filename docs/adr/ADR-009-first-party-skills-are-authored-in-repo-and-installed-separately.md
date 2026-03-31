# Title

First-party skills are authored in repo and installed separately

# Status

Approved

# Context

До Stage `7` папка `packages/skills/` существовала как placeholder и не содержала project-specific authored skill layer. При этом проект уже зафиксировал contracts, schemas, operator control-plane layer и review/generation boundaries, которые требуют повторяемых project-specific instructions для Codex/CLI usage.

Оставлять эти правила только в session prompt'ах или во внешних skills недостаточно: часть логики является project-specific, должна быть reviewable и должна жить рядом с authoritative docs/contracts. Одновременно runtime-installed skill copies для Codex не обязаны храниться path-wise внутри repo.

# Decision

- Repo хранит authored first-party skill sources в `packages/skills/`.
- Runtime-installed skill copies живут в agent install paths и рассматриваются как отдельная install surface.
- `packages/skills/` больше не считается placeholder-папкой.
- Internal skills остаются assistive layer поверх docs/contracts/schemas и не становятся source of truth.
- Project-specific policy и bounded workflows должны фиксироваться в repo-authored skills, даже если external skills используются как supplemental dependencies.

# Consequences

- Internal skills становятся version-controlled и reviewable как обычные source files.
- Repo получает устойчивый source layer для project-specific Codex guidance.
- Source path и install path могут расходиться, поэтому operational install/sync discipline нужно поддерживать отдельно.
- Изменения internal skills требуют поддержки registry/docs linkage, чтобы authored layer оставался traceable.

# Rejected alternatives

- Хранить только runtime-installed copies и считать их authoritative.
- Оставить `packages/skills/` placeholder-папкой и полагаться только на external skills.
- Перенести project-specific rules только в prose docs без authored skill source files.
