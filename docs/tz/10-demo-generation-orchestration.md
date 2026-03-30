# 10-demo-generation-orchestration

## Purpose

Зафиксировать Stage `4` planning/data слой, который связывает `decision output`, resolved design seed, redesign brief и demo build plan перед будущей generation phase.

## Approved decisions

- В generation phase допускаются только leads с `PipelineDecision`:
  - `DEMO_FRONT_ONLY`
  - `DEMO_EDITABLE_CONTENT`
- `SKIP` и `AUDIT_ONLY` не являются generation inputs.
- Канонические generation modes:
  - `front-only`
  - `limited-editable-content`
- Допустимый mapping:
  - `DEMO_FRONT_ONLY -> front-only`
  - `DEMO_EDITABLE_CONTENT -> limited-editable-content`
- Generation orchestration обязана подчиняться decision boundary, editable scope boundary и preserved external flow boundary.
- Stage `4` contracts остаются planning/data artifacts и не становятся runtime implementation details.

## Entry criteria

Generation orchestration может стартовать только если одновременно соблюдены условия:

- у lead уже есть final `Decision` с `DEMO_FRONT_ONLY` или `DEMO_EDITABLE_CONTENT`;
- qualification result и decision result доступны как stable upstream artifacts;
- resolved design seed собран и его `seedConfidence` / `riskFlags` зафиксированы;
- preserved constraints, external flow status и editable scope определены явно;
- если earlier stages потребовали mandatory human approval для перехода в generation, этот gate либо закрыт, либо явно отражен как pending blocker в handoff artifacts.

## Canonical inputs

Канонические входы Stage `4`:

- `qualification.schema.json` payload;
- `decision.schema.json` payload;
- `design-seed.schema.json` payload;
- preset-derived direction из resolved design seed;
- observed site constraints и structured qualification findings;
- explicit operator-provided approved notes.

## Canonical outputs

Канонические выходы Stage `4`:

- `redesign-brief.schema.json` payload как human/machine handoff artifact;
- `demo-build-plan.schema.json` payload как machine-readable minimal generation scope;
- optional Markdown projection через `templates/design-brief/DESIGN.template.md`, если нужен human-readable handoff.

## Generation modes

### `front-only`

- Используется только для `DEMO_FRONT_ONLY`.
- Не может silently превращаться в editable demo.
- Editable scope в таком режиме должен оставаться пустым.
- Может redesign'ить copy, visual direction, layout hierarchy и preserved CTA/booking surfaces без симуляции внутренней логики.

### `limited-editable-content`

- Используется только для `DEMO_EDITABLE_CONTENT`.
- Не может расширяться в полноценную CMS, CRM, custom app или fake admin surface.
- Не может выходить за already approved editable blocks.
- Не может отменять preserved external flow.

## Page planning rules

- Default page scope должен оставаться минимальным и defensible:
  - `home`;
  - до `2` key service pages, если они обоснованы qualification findings;
  - `contact / booking surface`, если это требуется кейсу.
- Если сайт one-page, допускается `section-based single-page plan` вместо искусственного multi-page expansion.
- Generation orchestration не должна молча увеличивать sitemap и page count без достаточного evidence.
- Если предлагаемый page scope выходит за obvious defensible scope, нужен human approval.

## Content source rules

Приоритет источников контента:

1. verified current site content;
2. structured qualification findings;
3. preset-derived direction;
4. explicit operator-provided approved notes;
5. clearly marked placeholder / assumption.

Forbidden content behavior:

- нельзя выдумывать лицензии;
- нельзя выдумывать регуляторные claims;
- нельзя выдумывать врачебные или юридические результаты;
- нельзя выдумывать отзывы, которых нет;
- нельзя выдумывать несуществующие цены;
- нельзя выдумывать fake staff identities.

Если контента не хватает, это должно отражаться в `assumptions`, `placeholders` и `approvalRequired`, а не маскироваться как verified content.

## Output boundaries

Generation orchestration не имеет права:

- принимать `SKIP` или `AUDIT_ONLY` как generation input;
- silently апгрейдить `DEMO_FRONT_ONLY` в editable demo;
- расширять `DEMO_EDITABLE_CONTENT` в полноценную CMS, CRM или app logic;
- расширять approved editable scope;
- отменять preserved external flow;
- изобретать backend logic там, где ее нет;
- silently расширять sitemap, page count или functional scope за пределы защищаемого baseline.

## Stop conditions / downgrade paths

- Если final `Decision` не generation-eligible, Stage `4` не создает generation artifacts.
- Если required input artifacts отсутствуют или между ними есть materially conflicting constraints, orchestration должна остановиться и пометить case как not ready for generation.
- Если preserved external flow handling неясен, generation должна остановиться до human review.
- Если content gaps materially affect page scope, orchestration должна остановиться либо вернуть case на manual review.
- Если redesign direction конфликтует с observed site reality и конфликт нельзя защитить, generation должна остановиться до approval.
- Stage `4` может требовать re-review или decision reevaluation, но не должна silently переписывать `PipelineDecision`.

## Edge cases

- One-page lead: вместо forced multi-page plan используется section-based single-page plan.
- External booking/widget flow: redesign'ится surrounding front layer, а не симулируется solved backend.
- `DEMO_EDITABLE_CONTENT` case с complexity near `7`: требует явной проверки, что editable scope все еще defensible.
- Low `seedConfidence`: generation artifacts могут быть собраны только как approval-seeking handoff, а не как ready-to-run expansion.

## Acceptance criteria

- Документ явно перечисляет generation-eligible decisions и modes.
- Mapping decision type -> generation mode зафиксирован без неявных апгрейдов.
- Default page planning rule и content source priority описаны детерминированно.
- Forbidden content behavior и output boundaries перечислены явно.
- Stop conditions объясняют, когда case нельзя safely продвигать в generation.

## Out of scope

- Runtime generation engine и adapter implementation.
- Provider-specific build/deploy orchestration.
- Review dossier / PDF assembly.
- Preview deployment internals.
