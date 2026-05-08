<div class="ccaf-section-head" markdown>
<span class="ccaf-eyebrow">Exam reference</span>
# Claude Certified Architect — Foundations
<p>
Quick facts: format, weights, scenarios, and the rules that decide most exam questions.
</p>

<div class="ccaf-chip-row" markdown="0">
  <span class="ccaf-chip">Multiple choice</span>
  <span class="ccaf-chip ccaf-chip--domain">5 domains</span>
  <span class="ccaf-chip ccaf-chip--time">720 / 1000 to pass</span>
  <span class="ccaf-chip ccaf-chip--level">Foundations</span>
</div>
</div>

## At a glance

| Item | Detail |
|---|---|
| **Format** | Multiple choice, scenario-based |
| **Scenarios** | 4 of 6 randomly selected per attempt |
| **Passing score** | 720 / 1000 |
| **Domains** | 5 |
| **Cost** | Free for first 5,000 partner company employees |
| **Registration** | [Anthropic Skilljar portal](https://anthropic.skilljar.com) |
| **Prerequisites** | None formal. Targets solution architects building production apps with Claude. |

## Domain weights

| Domain | Weight | Focus |
|---|---|---|
| **D1 — Agentic Architecture & Orchestration** | ~25% | Agent SDK, loops, multi-agent orchestration, hooks, sessions |
| **D2 — Tool Design & MCP Integration** | ~20% | Tool design, structured errors, MCP servers, built-in tools |
| **D3 — Claude Code Configuration & Workflows** | ~20% | CLAUDE.md hierarchy, custom commands, skills, plan mode, CI/CD |
| **D4 — Prompt Engineering & Structured Output** | ~20% | Explicit criteria, few-shot, tool_use, validation-retry |
| **D5 — Context Management & Reliability** | ~15% | Case facts blocks, escalation, provenance, stratified metrics |

## What you'll see on the exam

Six recurring scenarios. Each pulls together architectural decisions across multiple domains:

1. **Customer Support Resolution Agent** — Agent SDK, MCP tools, escalation logic
2. **Code Generation with Claude Code** — CLAUDE.md, plan mode, slash commands, iteration
3. **Multi-Agent Research System** — orchestration, context passing, error propagation, provenance
4. **Developer Productivity with Claude** — tool selection, codebase exploration, generation
5. **Claude Code for CI/CD** — `-p` flag, structured output, Batches API, multi-pass review
6. **Structured Data Extraction** — JSON schemas, tool_use, validation-retry, few-shot

[Full scenario walkthroughs :material-arrow-right:](scenarios.md){ .md-button }

## How to pass

The exam rewards **specific architectural rules**, not opinions. If you internalize these patterns, most distractors collapse:

- Check `stop_reason` for loop termination — never parse text
- Use **programmatic hooks** for critical business rules — never prompts
- **4–5 tools per agent** — distribute the rest across subagents
- Use `${ENV_VAR}` for secrets in `.mcp.json` — never hardcode
- **Separate sessions** for code generation vs review — never same-session
- **Case facts blocks** at the start of context — never progressive summarization
- **Stratified metrics** by document type — never aggregate-only
- Track **provenance** (source, confidence, timestamp, agent) on multi-agent data

Every one of those maps directly to an exam scenario decision.

[See all 18 anti-patterns :material-arrow-right:](anti-patterns.md){ .md-button .md-button--primary }
