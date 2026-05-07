# Phase 3 — Exam Prep (Modules 9–12)

Focus: context management, provenance, hands-on integration exercises, full practice exams.

---

## Module 9 — Context Management (Domain 5.1 + 5.2)

**Source:** [Domain 5 — Context Management](https://claudecertifications.com/claude-certified-architect/domains/context-management)

### Read & note

- [ ] Progressive summarization risk (loses names, IDs, amounts, dates)
- [ ] "Lost in the middle": prioritize start/end positions
- [ ] **Case facts blocks:** immutable, structured, at start of context
- [ ] Trim verbose tool output while preserving critical info
- [ ] Valid escalation triggers: explicit request, policy gap, capability limit, business threshold, repeated failure
- [ ] Invalid triggers: sentiment, self-confidence
- [ ] Access failure vs empty result (recurring distinction)

### Hands-on

- [ ] Build a customer-support stub that holds case facts immutably at top of context
- [ ] Run 5 conversation turns, verify identifiers (Customer ID, Order #, amount) survive intact
- [ ] Compare against the same agent using progressive summarization — note what's lost

### Anti-patterns to memorize

- [ ] **AP-16** Progressive summarization of critical details → case facts blocks
- [ ] Compressing without preserving originals
- [ ] Disregarding the lost-in-the-middle effect

### Verify

- [ ] Practice Test 9 — score: ___/10

---

## Module 10 — Advanced Context & Provenance (Domain 5.3 + 5.4)

### Read & note

- [ ] Context degradation in extended sessions
- [ ] `/compact` to reclaim space
- [ ] Scratchpad files for cross-reset persistence
- [ ] Subagent delegation to offload exploration verbosity
- [ ] Crash recovery manifests for resumable state
- [ ] **Stratified metrics** > aggregate (track per-document-type accuracy)
- [ ] Provenance fields: source, confidence, timestamp, agent
- [ ] Conflict resolution: link claims to sources, never silently pick

### Hands-on

- [ ] Add provenance metadata to your Module 2 multi-agent demo
- [ ] Inject a deliberate source conflict; verify resolution surfaces both sources
- [ ] Track metrics stratified by document type, not just aggregate

### Anti-patterns to memorize

- [ ] **AP-17** Aggregate-only metrics → stratified per category
- [ ] **AP-18** No provenance for multi-agent data → source/confidence/timestamp/agent

### Verify

- [ ] Practice Test 10 — score: ___/10

---

## Module 11 — Integration & Hands-On Exercises

Build four end-to-end mini-projects. Each maps onto one or more exam scenarios.

### Hands-on (4 exercises)

- [ ] **Exercise A** — Customer-support agent end-to-end (covers Scenario 1)
- [ ] **Exercise B** — Claude Code config for a small repo: CLAUDE.md hierarchy + custom skill (Scenarios 2 / 4)
- [ ] **Exercise C** — Multi-agent research bot with provenance + stratified metrics (Scenario 3)
- [ ] **Exercise D** — CI/CD pipeline: `-p`, `--json-schema`, separate-session review (Scenario 5)

### Verify

- [ ] Full Practice Exam 1 (50 questions, all 6 scenarios) — score: ___/50
- [ ] Identify your weakest 2 domains for Module 12 focus:
  > _domain 1: ____
  > _domain 2: ____

---

## Module 12 — Final Exam Prep

### Targeted review

- [ ] Re-read the weakest domain pages identified in Module 11
- [ ] Re-do the [anti-pattern cheatsheet](anti-patterns.md) from memory (no peeking) — gaps to revisit:
  > _your notes_

### Full practice exams (timed)

- [ ] Full Practice Exam 2 — score: ___/50
- [ ] Full Practice Exam 3 — score: ___/50
- [ ] All three exams ≥80%? If not, loop on the weakest scenarios.

### Logistics

- [ ] Register on the Anthropic Skilljar portal
- [ ] Confirm partner-employee free seat status
- [ ] Schedule exam date: ___
- [ ] **Day-of:** review case-facts pattern, `stop_reason` rule, tool budget rule, `${ENV_VAR}` rule, separate-session rule

---

[Drill the 18 anti-patterns :material-arrow-right:](anti-patterns.md){ .md-button .md-button--primary }
