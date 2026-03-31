# 24-validation-hardening-and-readiness

## Purpose

Зафиксировать финальный Stage `8` как hardening/readiness слой перед repo-wide verification, чтобы repo можно было предметно проверять на согласованность и выбирать первый implementation slice без дальнейшего docs-only expansion.

## Approved decisions

- Stage `8` является финальным planning/hardening stage перед verification.
- Validation layers включают:
  - schema validation;
  - example validation;
  - cross-artifact consistency;
  - template-to-contract alignment;
  - skill registry/source integrity;
  - authored-skill frontmatter integrity;
  - install-plan sanity.
- Blocking issues должны четко отличаться от warnings.
- Warnings не должны silently маскироваться под pass.
- Repo readiness не равен product runtime readiness.
- После Stage `8` repo должен быть готов к repo-wide review и first implementation slice selection.

## Hardening goals

- Убедиться, что contracts и support artifacts не противоречат друг другу.
- Убедиться, что examples действительно usable как verification surface.
- Убедиться, что template layer и skill layer остаются projection/assistive layers.
- Убедиться, что source-to-install discipline для internal skills зафиксирован и проверяем.
- Убедиться, что approved boundaries не размываются support artifacts.

## Validation layers

1. Schema validation
   - Каждая schema должна парситься как draft-07 и оставаться human-auditable.
2. Example validation
   - Каждый example должен structurally match своей schema.
3. Cross-artifact consistency
   - Docs, schemas, examples, templates, skills, registry и install-plan не должны противоречить друг другу.
4. Template-to-contract alignment
   - Template headings и semantics должны совпадать с canonical structured contracts.
5. Skill registry/source integrity
   - `registry.json` должен ссылаться на существующие `SKILL.md`.
6. Authored-skill frontmatter integrity
   - Все internal skills должны иметь валидный minimal frontmatter.
7. Install-plan sanity
   - `install-plan` должен ссылаться на authored source и не путаться с runtime state.

## Blocking vs non-blocking issues

### Blocking issues

- invalid schema;
- example/schema mismatch;
- broken required reference chain;
- template contradiction with canonical contract;
- missing registry `sourcePath`;
- install plan contradiction with registry/source layer;
- любой support artifact, который silently расширяет approved policy boundary.

### Non-blocking issues

- format tooling gaps;
- documented warnings without contract breakage;
- optional projection-layer incompleteness;
- readability issues, которые не ломают source-of-truth semantics.

## Readiness model

- `blocked` - есть blocking issues; repo не готов к verification.
- `ready-with-warnings` - blocking issues закрыты, но warnings зафиксированы и не скрыты.
- `ready-for-verification` - blocking issues отсутствуют, warnings либо отсутствуют, либо не мешают перейти к repo-wide verification.

Readiness означает готовность к проверке planning/control-plane слоя. Это не означает, что runtime product уже готов или что implementation risk исчерпан.

## Repo-wide verification scope

- Проверка всех schemas и examples.
- Проверка artifact linkage semantics.
- Проверка template alignment against canonical contracts.
- Проверка authored skills, registry и install-plan consistency.
- Проверка roadmap/README/TZ/ADR на отсутствие нового Stage `9` planning drift.

## Edge cases

- Repo может быть `ready-with-warnings`, если warnings документированы и не ломают boundaries.
- Один support artifact может быть structurally valid, но semantic-blocking, если он переписывает approved policy.
- Отсутствие optional projection template не должно маскироваться как fail, если canonical structured contract intact.
- Format-tooling limitation должна оставаться warning, а не ложным pass.

## Acceptance criteria

- Из документа ясно, что Stage `8` финализирует planning/hardening phase.
- Validation layers перечислены явно.
- Blocking issues и warnings различаются без двусмысленности.
- Readiness model отделен от product runtime readiness.
- После документа понятен переход к repo-wide verification и implementation-slice selection.

## Out of scope

- Runtime test harnesses.
- CI/CD pipelines.
- Telemetry / analytics platform.
- Worker, CLI parser и deploy implementation.
