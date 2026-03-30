# 03-qualification-rubric

## Purpose

Зафиксировать, как именно оценивается существующий сайт перед pipeline decision: какие страницы смотрим, какие score fields ставим, как интерпретируем результаты и когда qualification должен остановить speculative build path.

## Approved decisions

- Qualification всегда идет по `home + 2 key service pages`.
- Если service pages неочевидны, выбираются наиболее коммерчески важные страницы.
- Если сайт one-page, разрешено использовать виртуальные views: `hero`, `service section`, `contact/booking section`.
- Канонический `ScoreSet` состоит из:
  - `redesignValue`
  - `buildFeasibility`
  - `contentSufficiency`
  - `complexity`
  - `confidence`
- Все score values - integers `1..10`.
- Complexity scale:
  - `1-3`: simple brochure/landing
  - `4-6`: medium service/content site
  - `7`: hybrid / external flow present
  - `8-10`: complex app/CRM/cabinet/e-commerce-heavy

## Rules / logic

### Page selection

Приоритет выбора qualification surface:

1. `home`
2. Наиболее коммерчески важная service page
3. Вторая по важности service page

Если сайт one-page:

1. `hero`
2. `service section`
3. `contact/booking section`

Если service architecture неочевидна:

- выбирается не "случайная внутренняя страница", а наиболее коммерчески важный route;
- blog posts, policy pages и purely informational pages не должны подменять service pages, если есть более коммерческий surface.

### Score definitions

| Score | Meaning |
| --- | --- |
| `redesignValue` | Насколько заметен потенциальный uplift от redesign для бизнеса и внешнего восприятия сайта. |
| `buildFeasibility` | Насколько реалистично собрать безопасный demo без симуляции несуществующей логики. |
| `contentSufficiency` | Хватает ли текущего контента, чтобы сделать убедительный demo без invented content system. |
| `complexity` | Насколько сайт близок к brochure/service site vs app/CRM/e-commerce-heavy system. |
| `confidence` | Насколько уверенно можно защищать recommendation без догадок и speculative assumptions. |

### Scoring guidance

- `redesignValue`
  - `1-3`: uplift низкий, current site уже достаточно приемлем
  - `4-6`: uplift умеренный, redesign может быть полезен
  - `7-10`: uplift высокий, demo потенциально покажет сильную разницу
- `buildFeasibility`
  - `1-3`: безопасный demo практически нереалистичен
  - `4-5`: build path возможен, но с ограничениями или высоким review load
  - `6-10`: build path реалистичен без выхода за approved boundaries
- `contentSufficiency`
  - `1-3`: контента не хватает, придется выдумывать слишком много
  - `4-5`: для `DEMO_FRONT_ONLY` может хватить, для editable demo обычно рано
  - `6-10`: контента достаточно, чтобы поддержать `DEMO_EDITABLE_CONTENT`
- `complexity`
  - `1-3`: simple brochure/landing
  - `4-6`: medium service/content site
  - `7`: hybrid / external flow present
  - `8-10`: too complex for safe v1 demo path
- `confidence`
  - `1-4`: recommendation хрупкая, нужна деградация в `AUDIT_ONLY`
  - `5-6`: условно допустимо, но borderline cases требуют human review
  - `7-10`: recommendation можно защищать уверенно

### Qualification evidence

Каждый qualification pass должен сохранить минимум:

- какой surface был выбран;
- почему эти страницы/секции считаются коммерчески важными;
- есть ли внешний booking/widget flow;
- есть ли anti-bot / geo / challenge;
- какие признаки говорят за `SKIP`, `AUDIT_ONLY`, `DEMO_FRONT_ONLY` или `DEMO_EDITABLE_CONTENT`.

## Edge cases

- One-page site не должен автоматически проигрывать qualification, если три section-level views дают достаточную оценку.
- Внешний booking flow не является автоматически отрицательным сигналом; он повышает `complexity` и может ограничить решение до `DEMO_FRONT_ONLY`.
- Если anti-bot / geo / challenge мешают полной оценке, первый результат уходит в `FAILED_RETRYABLE`; после одного неуспешного retry итог должен быть `AUDIT_ONLY`, а не speculative build.
- Если score pattern противоречив:
  - высокий `redesignValue`, но низкий `buildFeasibility`;
  - высокий `contentSufficiency`, но `complexity >= 8`;
  - или confidence низкий на пороге перехода между решениями,
  такой кейс должен считаться borderline и требовать human review.

## Acceptance criteria

- Документ однозначно фиксирует 3-view qualification rule и fallback для one-page site.
- Все пять score fields определены и интерпретируются одинаково во всех последующих docs/schemas.
- Complexity scale `1..10` совпадает с утвержденной product шкалой.
- В документе явно запрещено строить решения "по догадке" для blocked cases и fake app flows.

## Out of scope

- UI mock review criteria и detailed visual design system checks.
- DOM extraction heuristics и automation-specific scraping playbooks.
- Полная математическая модель или ML ranking.
