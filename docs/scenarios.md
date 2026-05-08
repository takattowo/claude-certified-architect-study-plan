<div class="ccaf-section-head" markdown>
<span class="ccaf-eyebrow">Scenario walkthroughs</span>
# Six scenarios. Four on your exam.
<p>
The exam draws <strong>4 of 6</strong> scenarios at random per attempt — master all six. For each one, learn the correct approach <em>and</em> the anti-pattern for every architectural decision. <a href="https://claudecertifications.com/claude-certified-architect/scenario-walkthroughs">Source page</a>.
</p>

<div class="ccaf-chip-row" markdown="0">
  <span class="ccaf-chip">6 scenarios</span>
  <span class="ccaf-chip ccaf-chip--critical">Master all 6</span>
  <span class="ccaf-chip ccaf-chip--time">~3 hr drill</span>
</div>
</div>

---

## Scenario 1 — Customer Support Resolution Agent

Tests: Agent SDK, MCP tools, escalation logic.

| Decision | ✅ Correct | ❌ Anti-pattern |
|---|---|---|
| Loop termination | Check `stop_reason` (continue on `tool_use`, exit on `end_turn`) | Parsing text for "done" keywords |
| Refund limit enforcement | PostToolUse hook blocking calls > $500 | "Never process refunds above $500" in system prompt |
| Escalation triggers | Explicit requests, policy gaps, capability limits, business thresholds | Sentiment-based or confidence-based escalation |
| Context preservation | Immutable "case facts" block at the start of context | Progressive summarization that loses specifics |

- [ ] All four decisions internalized

---

## Scenario 2 — Code Generation with Claude Code

Tests: CLAUDE.md configuration, plan mode, slash commands, iterative refinement.

| Decision | ✅ Correct | ❌ Anti-pattern |
|---|---|---|
| Team coding standards location | `.claude/CLAUDE.md` (project, version-controlled) | User-level or inline comments |
| Plan mode vs direct execution | Plan mode for multi-file architectural changes; direct for simple fixes | Always or never using plan mode |
| Complex refactoring | Skill with `context: fork` + tool restrictions | Running in main session context |
| Iterative refinement | TDD: failing test → implement → verify → refine | Vague instructions without verification criteria |

- [ ] All four decisions internalized

---

## Scenario 3 — Multi-Agent Research System

Tests: orchestration, context passing, error propagation, provenance.

| Decision | ✅ Correct | ❌ Anti-pattern |
|---|---|---|
| Architecture for parallel tasks | Hub-and-spoke: coordinator delegates to specialized subagents with isolated contexts | Flat architecture with shared global state |
| Context passing | Pass only task-relevant context to each subagent | Share full coordinator history with every subagent |
| Conflicting data resolution | Track information provenance (source, confidence, timestamp) | Arbitrarily choose or average without provenance |
| Subagent failures | Structured error propagation; distinguish access failure from empty result | Silent failures or generic error messages |

- [ ] All four decisions internalized

---

## Scenario 4 — Developer Productivity with Claude

Tests: tool selection, codebase exploration, code generation workflows.

| Decision | ✅ Correct | ❌ Anti-pattern |
|---|---|---|
| Tool selection optimization | Reduce to 4–5 tools per agent; distribute rest across specialized subagents | Longer descriptions, fine-tuning, model switching |
| Reading config files | Use the `Read` tool | Use Bash when a dedicated tool exists |
| Project-level MCP config | `.mcp.json` with `${ENV_VAR}` for secrets, version-controlled | Personal-only config or hardcoded API keys |
| File modification: Write vs Edit | Edit for targeted changes (preserves unchanged content) | Write replaces the entire file |

- [ ] All four decisions internalized

---

## Scenario 5 — Claude Code for CI/CD

Tests: `-p` flag, structured output, Batches API, multi-pass code review.

| Decision | ✅ Correct | ❌ Anti-pattern |
|---|---|---|
| Running in CI pipelines | `-p` flag for non-interactive mode + `--output-format json` | Interactive mode or stdin piping |
| Code review approach | Separate session for review (fresh context, no confirmation bias) | Same-session self-review |
| Nightly audits | Message Batches API (50% cost savings, 24h window) | Synchronous requests for non-urgent work |
| Structured output enforcement | `--json-schema` flag to enforce output shape | Regex parsing of unstructured output |

- [ ] All four decisions internalized

---

## Scenario 6 — Structured Data Extraction

Tests: JSON schemas, `tool_use`, validation-retry loops, few-shot prompting.

| Decision | ✅ Correct | ❌ Anti-pattern |
|---|---|---|
| Guaranteed structured JSON output | `tool_use` + JSON schema + `tool_choice` forcing a specific tool | Prompting "output as JSON" or regex post-processing |
| `tool_use` correctness | `tool_use` guarantees structure only; validate semantics separately | Assume schema match equals correctness |
| Validation failure handling | Append specific field-level error details, retry | Generic "there were errors, try again" |
| Ambiguous document types | `'other'` enum value + `document_type_detail` field; 2–4 few-shot examples | Rigid enum forcing misclassification |

- [ ] All four decisions internalized

---

## Mastery checklist

You're done with scenarios when you can:

- [ ] Recall all six scenario titles
- [ ] For each scenario, list the four architectural decisions tested
- [ ] For each decision, state both the correct approach and the anti-pattern
- [ ] Recognize a scenario from one decision-question alone

[Quick reference :material-arrow-right:](quick-reference.md){ .md-button .md-button--primary }
