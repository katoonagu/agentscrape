# Title

ADR-006: Demo generation does not expand decision boundary

## Status

Accepted

## Context

После Stage `0..3` у проекта уже есть final decision types, approval gates, preset layer и resolved design seed. Следующий шаг - определить generation handoff layer так, чтобы demo generation использовала уже утвержденные boundaries, а не переопределяла их на лету.

Без явного ограничения generation orchestration может начать расширять scope: превращать `DEMO_FRONT_ONLY` в editable case, достраивать лишние страницы, симулировать внутреннюю app logic или отменять preserved external flow ради более "полного" demo.

## Decision

- Demo generation orchestration подчиняется final `Decision` и не может переписывать `PipelineDecision`.
- `DEMO_FRONT_ONLY` может вести только к generation mode `front-only`.
- `DEMO_EDITABLE_CONTENT` может вести только к generation mode `limited-editable-content`.
- Generation не может расширять approved editable scope.
- Generation не может отменять preserved external flow boundary.
- Если generation handoff обнаруживает конфликт, missing inputs или scope ambiguity, он обязан остановиться, запросить approval или вернуть case на re-review, а не silently расширять решение.

## Consequences

- Build plan и redesign brief становятся boundary-enforcing artifacts, а не свободным planning prose.
- Subsequent implementation получает более жесткий contract и меньше пространства для scope creep.
- Cases с low confidence, material content gaps или ambiguous external flow чаще будут идти в approval path вместо агрессивной генерации.

## Rejected alternatives

- Разрешить generation orchestration самостоятельно апгрейдить `DEMO_FRONT_ONLY` до editable demo.
- Позволить build plan расширять page count и functional scope без явного evidence.
- Разрешить preserved external flow silently превращать во внутренний flow ради более эффектного demo.
- Перенести boundary enforcement только в runtime implementation и не фиксировать его в planning/data layer.
