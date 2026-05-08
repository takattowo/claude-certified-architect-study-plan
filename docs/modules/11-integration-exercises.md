# Module 11 — Integration & Hands-On Exercises

<div class="ccaf-module-meta" markdown="0">
  <span class="ccaf-chip ccaf-chip--domain">All five domains</span>
  <span class="ccaf-chip">Goal: wire concepts end-to-end</span>
  <span class="ccaf-chip ccaf-chip--time">8–12 hr</span>
  <span class="ccaf-chip ccaf-chip--level">Mastery</span>
</div>

## What you'll build

Four mini-projects that integrate concepts from Modules 1–10. Each maps onto one or more exam scenarios. By the end, you'll have built (in code) the architectural patterns the exam tests in prose.

| Exercise | Concepts covered | Exam scenario it maps to |
|---|---|---|
| A — Customer support agent | Loops, hooks, escalation, case facts | Scenario 1 |
| B — Claude Code config + skill | CLAUDE.md hierarchy, skill with fork, allowed-tools | Scenarios 2 + 4 |
| C — Multi-agent research bot | Hub-and-spoke, provenance, stratified metrics | Scenario 3 |
| D — CI/CD pipeline | `-p`, `--json-schema`, separate-session review, Batches | Scenario 5 |

---

## Exercise A — Customer Support Resolution Agent

### Spec

Build an agent that handles refund requests with these constraints:

1. Loop terminates on `stop_reason: "end_turn"` (Module 1)
2. PostToolUse hook blocks any refund > $500 (Module 3)
3. Case facts block holds customer + order info, immutable across turns (Module 9)
4. Escalation triggers: explicit request, policy gap, capability limit, business threshold (Module 3)
5. Sentiment-based escalation must NOT happen (Module 3)
6. `process_refund` tool returns structured errors (Module 4)

### Build steps

- [ ] **A.1** — Set up the basic agent loop. Log `stop_reason` per turn. Verify clean termination on `end_turn`.
- [ ] **A.2** — Define `process_refund` tool with structured error response (4-field shape).
- [ ] **A.3** — Build `case_facts` block from customer + order DB lookup at session start. Inject at start of every prompt.
- [ ] **A.4** — Add a PostToolUse hook on `process_refund` that blocks amounts > $500.
- [ ] **A.5** — Implement escalation routing with valid triggers only.
- [ ] **A.6** — Integration test: a $300 refund flows through. A $750 refund escalates with structured reason. An angry customer asking for $300 still gets the $300 (sentiment doesn't trigger).
- [ ] **A.7** — Run a 5-turn conversation. Confirm the case facts block survives intact (ask "what's the customer's account number?" at turn 5).

### Self-check questions (write answers in your repo's README)

- Why is the refund cap a hook rather than a system prompt instruction?
- What does the agent do if the database is unreachable when looking up the order? (Hint: structured error → graceful escalation, not silent empty.)
- How does the case facts block survive a `/compact`?

---

## Exercise B — Claude Code Configuration + Audit Skill

### Spec

Set up a small repo with:

1. Three-level CLAUDE.md hierarchy: user, project, directory (Module 5)
2. Modular project config using `@import` (Module 5)
3. A custom slash command for quick reviews (Module 5)
4. A skill with `context: fork` and `allowed-tools` for dependency audits (Module 5)
5. `.mcp.json` with `${ENV_VAR}` for any secret (Module 4)

### Build steps

- [ ] **B.1** — Create `~/.claude/CLAUDE.md` with personal preferences (e.g. "don't add emojis").
- [ ] **B.2** — Create `.claude/CLAUDE.md` with team standards. Use `@import` to include `.claude/rules/style.md` and `.claude/rules/testing.md`.
- [ ] **B.3** — Create a `legacy/CLAUDE.md` that overrides one rule from project-level.
- [ ] **B.4** — Verify precedence: open Claude Code in `legacy/`, project root, and an unrelated path. Confirm correct rules apply at each level.
- [ ] **B.5** — Author `/review` command. Run it. Confirm it sees the current session.
- [ ] **B.6** — Author `audit-deps` skill with `context: fork`, `allowed-tools: [Read, Bash, Grep]`, and `argument-hint`.
- [ ] **B.7** — Run `/audit-deps`. Confirm it runs in a fresh forked context. Try to make it Edit a file (it should refuse — no Edit in `allowed-tools`).
- [ ] **B.8** — Add a `.mcp.json` with at least one server using `${ENV_VAR}` for a secret. Commit. Verify no secret leaked.

### Self-check questions

- Why does `legacy/CLAUDE.md` win over `.claude/CLAUDE.md`?
- What's the difference in context behavior between `/review` and `/audit-deps`?
- What would change if `audit-deps` had no `allowed-tools` field?

---

## Exercise C — Multi-Agent Research System with Provenance

### Spec

Build a research system that:

1. Coordinator dispatches subagents in parallel (Module 2)
2. Each subagent has a focused tool set (4–5 tools) (Module 4)
3. Subagents return claims tagged with provenance (source, confidence, timestamp, agent) (Module 10)
4. Coordinator surfaces conflicts with rationale, never silently picks (Module 10)
5. Metrics stratified by source category (Module 10)
6. Subagent failures propagate as structured errors (Module 4)

### Build steps

- [ ] **C.1** — Define 3 subagents (e.g. docs_searcher, code_searcher, issues_searcher), each with 3–4 scoped tools.
- [ ] **C.2** — Coordinator prompt: decompose, dispatch in parallel (multiple Task calls per turn), synthesize.
- [ ] **C.3** — Each subagent's response includes provenance metadata for every claim.
- [ ] **C.4** — Coordinator stores all claims with metadata; on conflict, surfaces all claims with rationale.
- [ ] **C.5** — Inject deliberate conflicting claims; verify coordinator surfaces them rather than silently picking.
- [ ] **C.6** — Add stratified metrics: track answer accuracy per source category, not just aggregate.
- [ ] **C.7** — Force one subagent to fail (e.g. simulated DB down); verify coordinator distinguishes failure from empty result and propagates structured error.

### Self-check questions

- What happens if you pass the full coordinator history to each subagent? Try it and document the difference.
- What's the difference between "three subagents returned the same claim" (high confidence) vs "three returned different claims" (conflict)?
- Why is averaging "3 years" and "3.5 years" the wrong way to handle conflicting tenure claims?

---

## Exercise D — Claude Code in CI/CD

### Spec

Build a CI workflow that:

1. Generates code with `claude -p` (Module 6)
2. Reviews the generated code in a **separate session** (Module 6)
3. Uses `--json-schema` for structured review output (Module 6)
4. Submits a nightly batch audit via Batches API (Module 6 + 8)

### Build steps

- [ ] **D.1** — Set up a GitHub Actions workflow with a "generate" step using `claude -p` + `--output-format json`.
- [ ] **D.2** — Add a "review" step in a **separate job** that consumes the generated artifact in a fresh `claude -p` invocation.
- [ ] **D.3** — Define a JSON schema for review output (severity, line, message). Use `--json-schema` to enforce.
- [ ] **D.4** — Verify failure modes: omit `-p` (should hang), same-session review (compare bug-detection rate), schema violation (Claude refuses).
- [ ] **D.5** — Build a nightly Batches workflow: enumerate files needing audit, submit batch with deterministic `custom_id`, retrieve results, reconcile, post summary as a GitHub issue.
- [ ] **D.6** — Compare cost: same workload as sync vs Batches (50% savings expected).

### Self-check questions

- Why does omitting `-p` hang in CI?
- What's the cognitive mechanism that makes same-session review fail?
- When would you NOT use Batches even though the cost savings are appealing?

---

## End-of-module checkpoint

- [ ] All four exercises completed
- [ ] Self-check answers written down (don't skip — explaining is what cements the learning)
- [ ] Each exercise pushed to a public repo as a portfolio piece (optional but valuable)

---

## Where to go from here

After completing all four exercises:

- [ ] Run through all 25 questions in the [source practice question bank](https://claudecertifications.com/claude-certified-architect/practice-questions) (filter "All Domains")
- [ ] Score yourself per domain (the bank shows per-question feedback)
- [ ] Identify your weakest 2 domains and re-read the relevant modules
- [ ] Drill the [18 anti-patterns](../anti-patterns.md) from memory before scheduling

For exam logistics (registration, format, language, accommodations), the [official FAQ](https://claudecertifications.com/claude-certified-architect/faq) is the authoritative source.

---

[Drill the 18 anti-patterns :material-arrow-right:](../anti-patterns.md){ .md-button .md-button--primary }
[Open the quick reference :material-arrow-right:](../quick-reference.md){ .md-button }
