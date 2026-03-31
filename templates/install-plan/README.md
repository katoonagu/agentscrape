# install-plan template layer

`templates/install-plan/INSTALL.template.md` - human-readable projection для structured skill install plan artifacts.

## Mapping

- `Plan Context` <- `planId`, `registryRef`, `targetAgent`
- `Install Entries` <- `installEntries[]`
- `Sync Policy` <- `syncPolicy`
- `Verification Checks` <- `verificationChecks[]`
- `Notes` <- `notes[]`

## Rules

- Template не является source of truth.
- Canonical source of truth остается за `skill-install-plan.schema.json` payload.
- Template не должен превращаться в machine-state dump, installer script или pseudo-CI output.
