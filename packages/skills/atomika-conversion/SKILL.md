---
name: atomika-conversion
description: Помогает переводить qualification, decision, design-seed и redesign-brief в bounded redesign direction для website demo path. Используй, когда нужно предложить defensible page scope, section emphasis или conversion improvements для buildable cases без расширения decision boundary, editable scope или preserved external flow.
---

# atomika-conversion

## Когда использовать

- Когда уже существуют `qualification` и `decision`.
- Когда case generation-eligible и нужно собрать bounded redesign direction.
- Когда нужно уточнить defensible page scope, section priorities или conversion friction fixes внутри уже утвержденных границ.
- Когда нужно связать `design-seed` и `redesign-brief` с понятным conversion-safe output.

## Когда не использовать

- Для `SKIP` и `AUDIT_ONLY` как для buildable conversion proposal.
- До появления structured upstream inputs.
- Для product architecture решений, backend logic или app behavior.
- Для выдумывания контента или расширения scope ради “более эффектного” demo.

## Обязательные входы

- `qualification`
- `decision`
- `design-seed`
- `redesign-brief`, если он уже существует для кейса

## Проверки перед действием

- Подтверди, что `decision` = `DEMO_FRONT_ONLY` или `DEMO_EDITABLE_CONTENT`.
- Проверь, что editable scope явно ограничен approved blocks.
- Проверь, что external flow, если он есть, отмечен как preserved.
- Проверь, что page scope опирается на qualification evidence, а не на желание расширить sitemap.
- Если source material неполный, пометь assumptions или approval triggers, а не придумывай недостающее.

## Что можно предлагать

- Bounded redesign direction для существующего case.
- Defensible page scope: `home`, до `2` key service pages, `contact / booking surface` или section-based single-page plan.
- Section emphasis для hero, services, prices, team, reviews, contacts, faq, gallery, cta в пределах approved scope.
- Conversion friction fixes, если они опираются на evidence из qualification и не ломают preserved constraints.
- Явные assumptions, placeholders и approval triggers, когда данных не хватает.

## Что запрещено

- Расширять editable scope beyond approved blocks.
- Убирать preserved external flow или подменять его fake internal flow.
- Изобретать CMS, CRM, booking backend или app logic.
- Fabricate claims, reviews, prices, staff identities, licenses, guarantees или results.
- Молча добавлять страницы без defensible evidence.
- Превращать `DEMO_FRONT_ONLY` в editable case.

## Ожидаемый результат

- Короткий bounded output, привязанный к входным artifacts.
- Явный список proposed page/section priorities без policy widening.
- Явно отмеченные preserved constraints.
- Assumptions и approval triggers там, где evidence недостаточно.
- Формулировки уровня guidance, а не source-of-truth artifact replacement.
