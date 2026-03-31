# Title

Stage 8 hardening precedes implementation

# Status

Approved

# Context

К завершению Stage `7` repo уже содержит contracts, schemas, examples, templates, operator control artifacts, authored skills и skill registry. Без финального hardening/readiness слоя следующий шаг рискует снова расползтись в planning expansion вместо предметной verification и выбора первого implementation slice.

Также source/install discipline для internal skills и cross-artifact consistency rules должны быть зафиксированы до начала runtime slices, иначе repo потеряет ясный source-of-truth model.

# Decision

- Stage `8` фиксируется как финальный planning/hardening stage.
- После Stage `8` repo проходит repo-wide verification и intentional selection of the first implementation slice.
- Новый docs-only Stage `9` не вводится как стандартное продолжение roadmap.
- Validation/readiness artifacts и install operationalization оформляются как support/control layer, а не как runtime implementation.

# Consequences

- Repo получает явный stop rule against endless planning expansion.
- Verification становится следующим обязательным шагом после Stage `8`.
- Support artifacts для validation/install readiness должны оставаться bounded и не переопределять core business rules.
- Любые дальнейшие planning additions после Stage `8` требуют явного пересмотра, а не автоматически наследуются roadmap'ом.

# Rejected alternatives

- Продолжать добавлять новые docs-only stages после Stage `8`.
- Начать implementation без финального hardening/readiness layer.
- Рассматривать validation/install readiness как неформальные notes без structured support artifacts.
