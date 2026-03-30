# 08-preset-resolution

## Purpose

Зафиксировать канонические правила inheritance и override для preset resolution, чтобы один и тот же lead получал предсказуемый resolved preset context перед сборкой design seed.

## Approved decisions

- Канонический override chain:
  `global defaults -> niche preset -> existing-brand override -> lead override -> operator manual override`
- Автоматически может быть применен только один `primaryPresetId`.
- Если preset selection или override conflict не удается разрешить без догадок, нужен human approval.
- Пустой override не стирает inherited value, если поле явно не поддерживает clearing.

## Rules / logic

### Resolution order

1. `global defaults`
   - neutral baseline для всех leads.
2. `niche preset`
   - добавляет niche-specific defaults.
3. `existing-brand override`
   - уточняет resolved direction по текущим brand/site clues.
4. `lead override`
   - добавляет lead-specific findings из qualification/review notes.
5. `operator manual override`
   - final manual correction поверх всего остального.

### Merge behavior

Поля, которые merge'ятся как set-like collections:

- `applicability.positive_signals`
- `applicability.negative_signals`
- `applicability.typical_offers`
- `applicability.site_clues`
- `layout.required_sections`
- `layout.optional_sections`
- `editingScope.allowed_editable_blocks`
- `approvalHints.manual_review_required_when`
- `approvalHints.do_not_auto_apply_when`

Правило merge:

- порядок сохраняется по первому появлению;
- дубликаты удаляются;
- higher-priority source может добавить новое значение, но не должен silently удалять inherited values.

### Replace behavior

Поля, которые заменяются целиком higher-priority source:

- `copy.tone`
- `copy.cta_bias`
- `copy.trust_emphasis`
- `copy.headline_style`
- `qualification.complexity_bias`
- `qualification.editable_content_default`
- `qualification.external_flow_policy`

### Replace-as-ordered-set behavior

Поля, которые трактуются как полный ordered preference list:

- `layout.ordering_bias`

Higher-priority source заменяет весь ordered set, а не частично merge'ит его.

### Soft-replace with fallback

Поля, которые higher-priority source может заменить, но если значение слабое/отсутствует, сохраняется inherited direction:

- `designSeed.visual_direction`
- `designSeed.palette_direction`
- `designSeed.typography_direction`
- `designSeed.imagery_direction`

Правило soft-replace:

- если override непустой и осмысленный, он становится primary;
- если override отсутствует или явно low-confidence, остается inherited value;
- если override конфликтует с site reality, higher-priority source все равно выигрывает, но case может требовать human approval.

### Missing values

- Missing field наследуется от предыдущего слоя.
- Empty array или empty string не трактуются как implicit delete.
- Clearing допускается только если в последующем stage будет введен явный clearing convention. Assumption: в текущем stage такого механизма нет.

### Conflict handling

- Если preset противоречит site reality, higher-priority source wins.
- Если existing-brand clue противоречит operator reference, operator manual override wins.
- Если conflict остается неоднозначным и требует субъективного выбора direction, `requiresHumanApproval = true`.
- Preset не может override Stage `0..2` policy:
  - не может разрешить fake app/admin logic;
  - не может расширить editable scope beyond approved blocks;
  - не может отменить downgrade rules для blocked/external-flow/high-complexity cases.

### Multi-fit handling

- Если несколько niche presets подходят lead, resolution должен попытаться выбрать одного primary winner по strongest positive signals и minimal negative signals.
- Если clear winner отсутствует, case маркируется как multi-fit.
- Multi-fit case:
  - не должен auto-apply more than one preset;
  - должен поднять human approval requirement;
  - может использовать `global-defaults` как temporary neutral baseline до ручного выбора.

### Mandatory human approval

Human approval обязателен, если:

- case multi-fit без clear primary preset;
- operator references и existing-brand clues уводят seed в разные directions;
- brand reality слабая или противоречивая, а preset choice materially влияет на redesign direction;
- external-flow case требует deviation от default niche assumptions.

## Edge cases

- Сайт визуально слабый, но brand copy/offer ясные: design direction можно брать из preset, а copy/layout bias - из lead findings.
- Lead похож и на `dental-clinic`, и на `beauty-salon` из-за mixed services: без явного primary service direction нужен manual choice.
- `global-defaults` никогда не должен выигрывать у niche preset, если niche fit подтвержден.
- Operator может intentionally override niche preset в сторону более conservative or more distinctive direction; это допустимо и должно считаться final layer.

## Acceptance criteria

- Из документа понятно, какие поля merge'ятся, а какие replace'ятся.
- Missing-value behavior и conflict handling описаны однозначно.
- Multi-fit logic не оставляет implementer'у решения о том, применять ли несколько presets одновременно.
- Документ не конфликтует с policy Stage `0..2`.

## Out of scope

- Runtime merge engine implementation.
- Exact scoring formula для auto-selection between multiple presets.
- Schema для resolved design seed artifact.
