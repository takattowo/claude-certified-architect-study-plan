# Phase 1 — Foundations (Modules 1–4)

Focus: agentic loops, multi-agent orchestration, hooks, tool design, MCP integration.

By the end of Phase 1 you should be able to:

- Build a minimal agent loop in Python from scratch and explain every line
- Design a hub-and-spoke multi-agent system on a whiteboard in 2 minutes
- Decide hook vs prompt for any given rule, instantly
- Write a tool description that the model uses correctly on the first try

---

## The four modules

<div class="grid cards" markdown>

-   :material-numeric-1-circle: **Agentic Loops & Core API**

    ---

    The five-step loop. `stop_reason` as the only valid control signal. Hands-on: build a minimal loop in Python, log every turn, force the failure modes.

    [Open Module 1 :material-arrow-right:](modules/01-agentic-loops.md)

-   :material-numeric-2-circle: **Multi-Agent Orchestration**

    ---

    Hub-and-spoke pattern. Context isolation. Parallel `Task` dispatch. `--fork-session` vs `--resume`. Hands-on: build a coordinator dispatching parallel subagents.

    [Open Module 2 :material-arrow-right:](modules/02-multi-agent.md)

-   :material-numeric-3-circle: **Hooks, Workflows & Sessions**

    ---

    Deterministic hooks vs probabilistic prompts. PreToolUse vs PostToolUse. Valid + invalid escalation triggers. Hands-on: PostToolUse hook blocking refunds over $500.

    [Open Module 3 :material-arrow-right:](modules/03-hooks-sessions.md)

-   :material-numeric-4-circle: **Tool Design & MCP**

    ---

    Description quality. Structured error responses (4 fields). The 4–5 tools/agent rule. `${ENV_VAR}` for secrets. Hands-on: custom MCP server with structured errors.

    [Open Module 4 :material-arrow-right:](modules/04-tool-design-mcp.md)

</div>

---

## Phase 1 progress

- [ ] Module 1 complete (anti-patterns memorized, hands-on shipped)
- [ ] Module 2 complete (anti-patterns memorized, hands-on shipped)
- [ ] Module 3 complete (anti-patterns memorized, hands-on shipped)
- [ ] Module 4 complete (anti-patterns memorized, hands-on shipped)
- [ ] All Domain 1 questions on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) attempted at least once (filter: Agentic Architecture, 6 questions)
- [ ] All Domain 2 questions attempted (filter: Tool Design & MCP, 4 questions)
- [ ] Phase 1 retrospective written (what's still fuzzy?)

---

[Continue to Phase 2 :material-arrow-right:](phase-2-applied.md){ .md-button .md-button--primary }
