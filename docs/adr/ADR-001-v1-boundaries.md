# Title

ADR-001: v1 boundaries

## Status

Accepted

## Context

`agentscrape` проектируется как internal agency tool для semi-automated website workflow. На старте есть риск расползания scope в dashboard product, anti-theft layer, полноценную CMS/CRM логику и направления beyond websites. Это делает implementation phase неуправляемой и размывает decision criteria для того, что вообще считается buildable case.

## Decision

- `v1` ограничивается website-focused workflow: intake, qualification, decisioning, preview manifesting и review/report preparation.
- Интерфейс `v1` - только CLI.
- Dashboard не входит в `v1`.
- Demo protection / anti-theft не входит в `v1`.
- `DEMO_EDITABLE_CONTENT` ограничивается простыми content blocks и не включает полноценную CMS/CRM, user кабинеты, inventory или complex e-commerce logic.
- Generated builds не являются частью репозитория и не определяют scope planning repo.

## Consequences

- Architecture и docs могут быть выстроены вокруг control-plane/manifests слоя, а не UI product layer.
- Implementation roadmap можно вести stage-by-stage без давления на premature dashboard/backend scope.
- Любой feature request, который уводит систему в app simulation, internal ops software или asset protection, должен считаться out of scope until a new ADR says otherwise.

## Rejected alternatives

- Делать dashboard-first `v1`.
- Включать anti-theft / demo protection в стартовый scope.
- Пытаться поддержать полноценную CMS/CRM внутри demo pipeline.
- Сразу расширять продукт beyond websites.
