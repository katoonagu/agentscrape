# 00-scope-v1

## Purpose

Зафиксировать границы `v1` для `agentscrape` как internal CLI-first pipeline, который принимает website leads, квалифицирует существующие сайты, принимает решение о допустимом типе demo и подготавливает preview/review artifacts.

## Approved decisions

- `v1` работает только в домене websites. Новые product directions beyond websites не утверждены.
- Интерфейс `v1` - только CLI. Dashboard в `v1` не делается.
- Lead без сайта не обрабатывается дальше и получает `reasonCode = NO_SITE`.
- Qualification всегда делается по `home + 2 key service pages`.
- Если сайт one-page, допускаются виртуальные страницы/секции: `hero`, `service section`, `contact/booking section`.
- Для external booking/widget flows не строится фейковая админка и не имитируется фейковая app-логика.
- Generated builds не хранятся в git-репозитории и живут как внешние preview deployments / artifacts.
- Demo protection / anti-theft в `v1` не делается.
- `DEMO_EDITABLE_CONTENT` не означает полноценную CMS, CRM, user cabinet, inventory или complex e-commerce.

## Rules / logic

- Pipeline `v1` покрывает только semi-automated workflow:
  - intake лидов через scrape или ручной список;
  - qualification существующего сайта;
  - decisioning: `SKIP`, `AUDIT_ONLY`, `DEMO_FRONT_ONLY`, `DEMO_EDITABLE_CONTENT`;
  - preview manifesting для buildable кейсов;
  - review dossier / report.
- Система обязана работать в одном из режимов: `autopilot`, `checkpointed`, `audit-only`.
- Buildable case определяется не по желанию оператора, а по qualification rubric, decision matrix и approval gates.
- Для `DEMO_EDITABLE_CONTENT` разрешены только простые editable blocks:
  - `hero`
  - `services`
  - `prices`
  - `team`
  - `reviews`
  - `contacts`
  - `faq`
  - `gallery`
  - `cta`
- Assumption: `v1` planning layer описывает contracts и decisions, а не implementation detail конкретного runtime stack.

## Edge cases

- Бизнес без сайта: lead останавливается до qualification и маркируется как `SKIP` с `NO_SITE`.
- External flow присутствует, но сайт в остальном buildable: допускается только redesign front layer вокруг внешнего flow.
- Anti-bot / geo / challenge: первый сбой ведет в `FAILED_RETRYABLE`; после одного неудачного retry кейс понижается в `AUDIT_ONLY`.
- One-page site: qualification не блокируется, если можно выделить три осмысленных section-level views.

## Acceptance criteria

- Документ однозначно отделяет `v1` websites scope от неутвержденных направлений.
- В документе явно зафиксированы CLI-only, no-dashboard, no-anti-theft и builds-outside-repo.
- В документе не остается двусмысленности между `DEMO_FRONT_ONLY` и `DEMO_EDITABLE_CONTENT`.
- Документ позволяет implementer'у определить, какие направления и фичи не должны попадать в Stage `1` и Stage `2`.

## Out of scope

- Dashboard UI.
- Full CMS / CRM.
- User accounts, role systems, inventory, полноценные внутренние процессы.
- Anti-theft, watermarking, demo protection.
- Хранение generated builds внутри git.
- Детальная проработка Stage `3+`.
