# 06-decision-matrix

## Purpose

Зафиксировать каноническую decision logic для перехода от qualification scores и evidence к одному из `PipelineDecision`, набору `ReasonCode` и обязательности human approval.

## Approved decisions

- Канонические `PipelineDecision`:
  - `SKIP`
  - `AUDIT_ONLY`
  - `DEMO_FRONT_ONLY`
  - `DEMO_EDITABLE_CONTENT`
- Канонические `ReasonCode`:
  - `NO_SITE`
  - `DUPLICATE_DOMAIN`
  - `LOW_UPLIFT`
  - `LOW_FEASIBILITY`
  - `TOO_COMPLEX`
  - `LOW_CONFIDENCE`
  - `BLOCKED_BY_ANTI_BOT`
  - `EXTERNAL_FLOW_PRESERVED`
  - `ENOUGH_CONTENT_FOR_EDITABLE_DEMO`
- Mandatory human approval требуется для:
  - hybrid / external-flow cases;
  - conflicting score patterns;
  - low-confidence borderline cases.

## Rules / logic

### Decision order

Decision order должен применяться сверху вниз. Первый сработавший hard gate фиксирует итоговую ветку, если ниже не указано иное.

1. `SKIP`
   - если у lead нет сайта -> `SKIP` + `NO_SITE`
   - если lead признан дублем canonical domain -> `SKIP` + `DUPLICATE_DOMAIN`
   - если `redesignValue <= 3` -> `SKIP` + `LOW_UPLIFT`
   - если `buildFeasibility <= 3` и нет retryable blocker path -> `SKIP` + `LOW_FEASIBILITY`
2. `AUDIT_ONLY`
   - если anti-bot / geo / challenge сохраняются после одного неуспешного retry -> `AUDIT_ONLY` + `BLOCKED_BY_ANTI_BOT`
   - если `complexity >= 8` -> `AUDIT_ONLY` + `TOO_COMPLEX`
   - если `confidence <= 4` -> `AUDIT_ONLY` + `LOW_CONFIDENCE`
   - если score pattern конфликтный и безопасное demo recommendation нельзя защитить -> `AUDIT_ONLY`
3. `DEMO_EDITABLE_CONTENT`
   - если одновременно:
     - `redesignValue >= 6`
     - `buildFeasibility >= 6`
     - `contentSufficiency >= 6`
     - `complexity <= 6`
     - `confidence >= 6`
   - и editable scope укладывается только в разрешенные content blocks
   - к `reasonCodes` добавляется `ENOUGH_CONTENT_FOR_EDITABLE_DEMO`
4. `DEMO_FRONT_ONLY`
   - если одновременно:
     - `redesignValue >= 6`
     - `buildFeasibility >= 5`
     - `complexity <= 7`
     - confidence достаточно высок для defensible recommendation
   - и либо:
     - внешний flow должен быть сохранен;
     - либо `contentSufficiency < 6`

### Allowed editable scope for `DEMO_EDITABLE_CONTENT`

Разрешенные editable blocks:

- `hero`
- `services`
- `prices`
- `team`
- `reviews`
- `contacts`
- `faq`
- `gallery`
- `cta`

Если demo требует anything beyond these blocks, решение не должно оставаться `DEMO_EDITABLE_CONTENT`.

### `ReasonCode` semantics

| ReasonCode | Meaning |
| --- | --- |
| `NO_SITE` | У бизнеса не найден рабочий сайт. |
| `DUPLICATE_DOMAIN` | Lead поглощен canonical domain record. |
| `LOW_UPLIFT` | Потенциальный redesign uplift слишком низкий. |
| `LOW_FEASIBILITY` | Safe build path слишком слабый даже без blocker path. |
| `TOO_COMPLEX` | Case выходит за complexity boundary `v1`. |
| `LOW_CONFIDENCE` | Recommendation нельзя уверенно защитить. |
| `BLOCKED_BY_ANTI_BOT` | Persistent anti-bot / geo / challenge umbrella code после retry. |
| `EXTERNAL_FLOW_PRESERVED` | Demo оставляет внешний booking/widget flow и redesign'ит только front layer. |
| `ENOUGH_CONTENT_FOR_EDITABLE_DEMO` | Контента достаточно для ограниченного editable demo scope. |

### Conflicting scores and borderline logic

Кейс считается conflicting, если выполняется хотя бы одно:

- `redesignValue >= 6` и `buildFeasibility <= 4`
- `contentSufficiency >= 6` и `complexity >= 7`
- есть внешний flow, но остальной score pattern тянет в `DEMO_EDITABLE_CONTENT`
- разные score dimensions указывают на разные ветки решения без явного приоритета

Кейс считается borderline, если любой score находится в пределах `1` пункта от decision threshold и при этом:

- `confidence <= 6`, или
- оператор не может защитить recommendation без дополнительных assumptions

Для conflicting и low-confidence borderline cases:

- итог можно оставить прежним только после human approval;
- без такого approval default downgrade - `AUDIT_ONLY`.

### Human approval rules

- `requiresHumanApproval = true`, если есть `EXTERNAL_FLOW_PRESERVED`.
- `requiresHumanApproval = true`, если кейс conflicting.
- `requiresHumanApproval = true`, если кейс borderline с low confidence.
- В `checkpointed` mode approvals проходят batch-wise по `10` leads.

## Edge cases

- External flow case может быть buildable, но по умолчанию не должен становиться fake editable app.
- `contentSufficiency >= 6` само по себе не гарантирует `DEMO_EDITABLE_CONTENT`, если `complexity = 7` из-за hybrid flow.
- Persistent blocker path всегда важнее high redesign value: сильный uplift не отменяет downgrade в `AUDIT_ONLY`.
- Если нет сайта, дополнительные scores не должны "спасать" lead от `SKIP`.

## Acceptance criteria

- Для любого qualification result implementer может детерминированно выбрать decision branch.
- Thresholds для всех четырех `PipelineDecision` явно перечислены.
- `ReasonCode` список совпадает с docs и schemas без расхождений.
- Mandatory human approval logic зафиксирована без неявных исключений.

## Out of scope

- Weighted scoring formula или ML ranking.
- Fine-grained generation prompts и UI implementation policies.
- Operator UX details beyond gate semantics.
