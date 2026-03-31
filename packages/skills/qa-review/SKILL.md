---
name: qa-review
description: Project-specific review skill для before/after analysis, review dossier support и evidence-backed findings. Используй, когда нужно оценить audit-only или preview-backed-demo case, различить recommended и implemented changes, зафиксировать preserved constraints и сформулировать dossier-safe findings без invented improvements.
---

# qa-review

## Когда использовать

- Когда нужно подготовить или проверить review findings для `audit-only` или `preview-backed-demo` case.
- Когда есть before evidence и, при наличии preview, after evidence.
- Когда нужно убедиться, что wording для dossier не смешивает recommendation и implementation.

## Когда не использовать

- Как substitute для generation planning.
- До появления достаточного review evidence.
- Для утверждений об implemented changes без preview-backed подтверждения.

## Процедура review

1. Определи dossier mode: `audit-only` или `preview-backed-demo`.
2. Сопоставь findings с structured dossier и связанными artifacts.
3. Проверь, какие утверждения относятся к observed before-state, а какие - к implemented/preview-visible after-state.
4. Проверь preserved constraints: external flow, editable scope, page scope, non-goals.
5. Зафиксируй findings только там, где есть evidence-backed основание.

## Требования к evidence

- Для before-only findings достаточно reliable before evidence.
- Для before/after findings нужны both before и after refs.
- Если after evidence нет, нельзя описывать change как implemented fact.
- Screenshots, images и linked documents допустимы как evidence refs, если они traceable.

## Issue taxonomy

Используй понятные issue labels, например:

- `clarity`
- `trust`
- `conversion-friction`
- `information-architecture`
- `scope-compliance`
- `external-flow-handling`
- `truthfulness`

## Before-only vs before/after

- `audit-only`: описывай weaknesses, risks и recommended changes, не притворяясь, что after-state уже существует.
- `preview-backed-demo`: различай recommended и actually preview-visible changes.
- Если часть изменения реализована, а часть нет, формулируй это явно как partial / limited observation.

## Dossier-safe wording rules

- Используй “наблюдается”, “видно по preview”, “рекомендуется”, “сохранено”, “не подтверждено”.
- Не используй формулировки, которые делают unsupported implementation claims.
- Structured dossier остается source of truth; narrative должен быть совместим с ним.

## Запрещенные review behaviors

- Invented improvements без evidence.
- Подмена recommended changes на implemented changes.
- Игнорирование preserved constraints.
- Утверждение, что external flow solved internally, если он preserved.
- Смешивание audit-only и preview-backed semantics в одном finding без явной маркировки.

## Ожидаемый результат

- Четкие evidence-backed findings.
- Явное различие between before-only и before/after analysis.
- Формулировки, безопасные для structured dossier.
- Никаких invented implemented facts.
