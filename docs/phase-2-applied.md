# Phase 2 — Applied Knowledge (Modules 5–8)

Focus: Claude Code config, CI/CD integration, prompt engineering, validation strategies.

---

## Module 5 — Claude Code Configuration (Domain 3.1 + 3.2)

**Source:** [Domain 3 — Claude Code Configuration](https://claudecertifications.com/claude-certified-architect/domains/claude-code-config)

### Read & note

- [ ] CLAUDE.md hierarchy: user (`~/.claude/CLAUDE.md`) → project (`.claude/CLAUDE.md`) → directory (`CLAUDE.md`)
- [ ] Precedence: directory > project > user
- [ ] `@import` syntax for modular markdown
- [ ] `.claude/rules/` directory pattern, YAML frontmatter glob scoping
- [ ] **Commands** (`.claude/commands/`) = current-session quick actions
- [ ] **Skills** (`.claude/skills/SKILL.md`) = forked-context multi-step
- [ ] SKILL.md frontmatter: `context: fork`, `allowed-tools`, `argument-hint`

### Hands-on

- [ ] Author a project-level `.claude/CLAUDE.md` with team standards
- [ ] Add a directory-level `CLAUDE.md` with module-specific rules — verify override
- [ ] Build one slash command (e.g., `/review`) under `.claude/commands/`
- [ ] Build one skill with `context: fork` and an `allowed-tools` restriction

### Anti-patterns to memorize

- [ ] **AP-10** Personal preferences in project-level CLAUDE.md → user-level (`~/.claude/CLAUDE.md`)
- [ ] **AP-11** Commands for tasks needing context isolation → skills with `context: fork`
- [ ] One massive config file → modular with `@import`
- [ ] Skills without tool restrictions → always set `allowed-tools`

### Verify

- [ ] Practice Test 5 — score: ___/10

---

## Module 6 — Plan Mode, Iteration & CI/CD (Domain 3.3 + 3.4)

### Read & note

- [ ] Plan mode triggers: multi-file architectural change, expensive-to-undo, design decisions
- [ ] Direct execution: simple, single-file, obviously correct
- [ ] Iterative refinement: concrete examples, TDD cycle, interview pattern
- [ ] **TDD:** failing test → implement → verify → refine → repeat
- [ ] CI: `-p` flag (non-interactive), `--output-format json`, `--json-schema`
- [ ] Generator session ≠ reviewer session (separate to avoid confirmation bias)
- [ ] **Message Batches API:** 50% cost savings, 24h window, `custom_id` tracking
- [ ] Batch fits: nightly audits, weekly reviews. Not for blocking PR feedback.

### Hands-on

- [ ] Run Claude Code with `-p` and `--output-format json` in a terminal pipeline
- [ ] Set up a 2-step CI demo: generator session writes code, separate reviewer session reviews it
- [ ] Submit a small batch job via Anthropic Batches API, retrieve via `custom_id`

### Anti-patterns to memorize

- [ ] **AP-12** Same-session self-review → separate sessions
- [ ] Interactive mode in CI → `-p`
- [ ] Synchronous for non-urgent → Batches API
- [ ] Always-or-never plan mode → match to task complexity

### Verify

- [ ] Practice Test 6 — score: ___/10

---

## Module 7 — Prompt Engineering & Structured Output (Domain 4)

**Source:** [Domain 4 — Prompt Engineering](https://claudecertifications.com/claude-certified-architect/domains/prompt-engineering)

### Read & note

- [ ] Explicit measurable criteria > vague ("be thorough" → false positives, alert fatigue)
- [ ] Few-shot: 2–4 examples optimal; consistent format; include one ambiguous edge case
- [ ] `tool_use` guarantees **structure only**, not semantics
- [ ] `tool_choice`: `'auto'` / `'any'` / forced
- [ ] Schema design: required fields, enums with `'other'` category, nullable fields
- [ ] Validate values after extraction (business-rule checks)
- [ ] Retry loops: append **specific** error details (which field, expected vs actual)
- [ ] Multi-pass: local per-file analysis + cross-file integration

### Hands-on

- [ ] Build a JSON-schema extractor with `tool_use` + forced `tool_choice`
- [ ] Inject 3 deliberately bad inputs; verify validation-retry loop with specific feedback
- [ ] Compare 0-shot, 2-shot, 6-shot results on an ambiguous task

### Anti-patterns to memorize

- [ ] **AP-13** Vague "be thorough" → explicit thresholds
- [ ] **AP-14** Assuming `tool_use` ⇒ semantic correctness → validate values too
- [ ] **AP-15** Generic retry → field-specific error feedback
- [ ] Rigid enum forcing misclassification → include `'other'` + detail field

### Verify

- [ ] Practice Test 7 — score: ___/10

---

## Module 8 — Validation, Batch & Multi-Pass

### Read & note

- [ ] Validation-retry pattern (append concrete failure details)
- [ ] Batch API workflow end-to-end: submit, poll, retrieve, reconcile via `custom_id`
- [ ] Multi-pass review: per-file local pass + cross-file integration pass
- [ ] Why same-session self-review fails: model retains generator reasoning

### Hands-on

- [ ] Implement a 2-pass code reviewer: pass 1 per-file, pass 2 cross-file integration
- [ ] Run reviewer in a **separate** session from the generator
- [ ] Compare hit rate vs same-session review on the same diff

### Verify

- [ ] Practice Test 8 — score: ___/10
- [ ] **Phase 2 retrospective:** still fuzzy on:
  > _your notes_

---

[Continue to Phase 3 :material-arrow-right:](phase-3-exam-prep.md){ .md-button .md-button--primary }
