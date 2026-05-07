# Anti-Patterns Cheatsheet

All 18 anti-patterns the exam tests, grouped by domain. Memorize each one's wrong-vs-right pairing — most distractors map directly to one of these.

**Source:** [Anti-Patterns page](https://claudecertifications.com/claude-certified-architect/anti-patterns)

!!! tip "How to use"
    Tick the checkbox next to each anti-pattern only when you can:

    1. State the wrong pattern in one sentence
    2. State the right pattern in one sentence
    3. Recognize it in a multi-choice scenario

---

## Domain 1 — Agentic Architecture (5)

### AP-1 — Parsing natural language for loop termination
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Text content is for the user, not control flow. The model may phrase completion differently each time.
**Right:** Check the `stop_reason` field (`tool_use` vs `end_turn`) for structured termination signals.

---

### AP-2 — Arbitrary iteration caps as primary stopping mechanism
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** May cut off the agent mid-task or allow it to loop pointlessly.
**Right:** Let the agentic loop terminate naturally via `stop_reason`.

---

### AP-3 — Prompt-based enforcement for critical business rules
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Prompts are probabilistic. The model **can and will** sometimes ignore critical instructions.
**Right:** Use programmatic hooks (PreToolUse / PostToolUse) for deterministic enforcement.

---

### AP-4 — Sentiment-based escalation to human agents
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** Sentiment does not equal task complexity.
**Right:** Escalate based on policy gaps, capability limits, explicit requests, or business thresholds.

---

### AP-5 — Self-reported confidence scores for decision-making
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** Model confidence scores are not well-calibrated and cannot be relied on for production decisions.
**Right:** Use structured criteria and programmatic checks for escalation decisions.

---

## Domain 2 — Tool Design & MCP (4)

### AP-6 — Generic error messages
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** "Operation failed" leaves the agent unable to decide whether to retry or escalate.
**Right:** Return structured errors with `isError`, `errorCategory`, `isRetryable`, and `context`.

---

### AP-7 — Silently returning empty results for access failures
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Agent thinks "no results found" when the real problem is access failure.
**Right:** Distinguish access failures (`isError: true`) from genuinely empty results (`isError: false`).

---

### AP-8 — Giving one agent 18+ tools
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** Tool selection accuracy degrades rapidly above 5 tools.
**Right:** Keep 4–5 tools per agent. Distribute the rest across specialized subagents.

---

### AP-9 — Hardcoding API keys in `.mcp.json` configuration
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Configuration files are committed to git. Hardcoded secrets get leaked.
**Right:** Use `${ENV_VAR}` environment variable expansion in MCP config.

---

## Domain 3 — Claude Code Configuration (3)

### AP-10 — Personal preferences in project-level CLAUDE.md
!!! note "Medium"
    - [ ] **Memorized**

**Wrong:** Personal preferences should not be imposed on the whole team.
**Right:** Use `~/.claude/CLAUDE.md` for personal prefs; `.claude/CLAUDE.md` for team standards.

---

### AP-11 — Using commands for complex tasks needing context isolation
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** Commands run in current session context, polluting it with exploration noise.
**Right:** Use skills with `context: fork` and `allowed-tools` restrictions.

---

### AP-12 — Same-session self-review in CI/CD pipelines
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Reviewer retains generator's reasoning context, creating confirmation bias.
**Right:** Use separate sessions for code generation and code review.

---

## Domain 4 — Prompt Engineering (3)

### AP-13 — Vague instructions like "be thorough"
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Leads to over-flagging, false positives, and alert fatigue.
**Right:** Provide explicit, measurable criteria with specific thresholds.

---

### AP-14 — Assuming `tool_use` guarantees semantic correctness
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** `tool_use` guarantees **structure** only. Values inside the JSON may still be wrong.
**Right:** Validate extracted values after `tool_use` with business-rule checks.

---

### AP-15 — Generic retry messages
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** "There were errors, please try again" provides no correction signal.
**Right:** Append specific error details: which field, what was wrong, expected vs actual.

---

## Domain 5 — Context & Reliability (3)

### AP-16 — Progressive summarization of critical customer details
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Each round of summarization loses specifics: names, IDs, amounts, dates.
**Right:** Use immutable "case facts" blocks positioned at the start of context.

---

### AP-17 — Aggregate accuracy metrics only
!!! danger "Critical"
    - [ ] **Memorized**

**Wrong:** Aggregate metrics mask per-category failures.
**Right:** Track accuracy per document type (stratified metrics).

---

### AP-18 — No provenance tracking for multi-agent data
!!! warning "High"
    - [ ] **Memorized**

**Wrong:** No way to determine which source to trust with conflicting data.
**Right:** Track source, confidence level, timestamp, and agent ID for all data.

---

[Study the 6 scenarios :material-arrow-right:](scenarios.md){ .md-button .md-button--primary }
