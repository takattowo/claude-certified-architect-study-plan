# Phase 1 — Foundations (Modules 1–4)

Focus: agentic loops, multi-agent orchestration, hooks, tool design, MCP.

---

## Module 1 — Agentic Loops & Core API (Domain 1.1)

**Source:** [Domain 1 — Agentic Architecture](https://claudecertifications.com/claude-certified-architect/domains/agentic-architecture)

### Read & note

- [ ] Agentic loop lifecycle: 5-step flow (send → respond → execute → append → repeat)
- [ ] `stop_reason` values: `'tool_use'` (continue) vs `'end_turn'` (terminate)
- [ ] Tool result appending pattern
- [ ] Why Agent SDK auto-handles loops but the exam tests mechanics

### Hands-on

- [ ] Write a minimal agent loop in Python using the Anthropic SDK
- [ ] Add a single tool, log `stop_reason` each turn
- [ ] Force a tool_use cycle, then end_turn — verify loop exits correctly

### Anti-patterns to memorize

- [ ] **AP-1** Parsing natural language for loop termination → check `stop_reason` instead
- [ ] **AP-2** Arbitrary iteration caps as primary stop → let loop terminate naturally

### Verify

- [ ] Practice Test 1 (10 questions on the source site) — score: ___/10

---

## Module 2 — Multi-Agent Orchestration (Domain 1.2)

### Read & note

- [ ] Hub-and-spoke architecture: coordinator + specialized subagents
- [ ] Context isolation between subagents
- [ ] `Task` tool in coordinator's `allowedTools`
- [ ] Parallel execution: multiple Task calls in a single response
- [ ] `fork_session` for branched parallel exploration
- [ ] Pass **only** task-relevant context to subagents

### Hands-on

- [ ] Build a coordinator that spawns 2 parallel subagents (e.g., one searches docs, one searches code)
- [ ] Confirm each subagent gets scoped context, not full history
- [ ] Synthesize results in the coordinator

### Anti-patterns to memorize

- [ ] Overly narrow decomposition creates coverage gaps
- [ ] Sharing full coordinator context with every subagent (context pollution)
- [ ] Failing to provide explicit context when delegating

### Verify

- [ ] Practice Test 2 — score: ___/10

---

## Module 3 — Hooks, Workflows & Sessions (Domain 1.3 + 1.4)

### Read & note

- [ ] Hooks (deterministic) vs prompts (probabilistic) — when to use which
- [ ] **PreToolUse**: block, modify params, validate before execution
- [ ] **PostToolUse**: modify output, normalize, side effects after execution
- [ ] Valid escalation triggers: explicit request, policy gap, capability limit, business threshold
- [ ] Invalid escalation triggers: sentiment, self-reported confidence
- [ ] Session ops: `--resume`, `fork_session`, `--session-name`
- [ ] Prompt chaining (predictable, linear) vs dynamic adaptive decomposition

### Hands-on

- [ ] Configure a PostToolUse hook in Claude Code settings (e.g., block `rm -rf /`)
- [ ] Force the hook to fire, observe the blocking behavior
- [ ] Try `--resume` and `fork_session` flows manually

### Anti-patterns to memorize

- [ ] **AP-3** Prompt-based enforcement for critical business rules → use hooks
- [ ] **AP-4** Sentiment-based escalation → use policy/capability/threshold-based
- [ ] **AP-5** Self-reported confidence for decisions → use structured criteria
- [ ] Stale context in long sessions → mitigate explicitly
- [ ] Static chains for adaptive tasks → use dynamic decomposition

### Verify

- [ ] Practice Test 3 — score: ___/10

---

## Module 4 — Tool Design & MCP Integration (Domain 2 in full)

**Source:** [Domain 2 — Tool Design & MCP](https://claudecertifications.com/claude-certified-architect/domains/tool-design-mcp)

### Read & note

- [ ] Tool description essentials: purpose, input specs, examples, edge cases, when **not** to use
- [ ] Structured error fields: `isError`, `errorCategory`, `isRetryable`, `context`
- [ ] Access failure (`isError: true`) vs empty result (`isError: false`) — critical distinction
- [ ] 4–5 tools per agent optimal; 18+ degrades selection
- [ ] `tool_choice`: `'auto'` / `'any'` / forced specific tool
- [ ] `.mcp.json` (project, version-controlled) vs `~/.claude.json` (user)
- [ ] `${ENV_VAR}` expansion for secrets — **never hardcode**
- [ ] MCP capabilities: tools, resources, prompts
- [ ] 6 built-in tools: Read, Write, Edit, Bash, Grep, Glob
- [ ] Write (new) vs Edit (modify); Grep (content) vs Glob (filenames); avoid Bash for file ops

### Hands-on

- [ ] Write a custom MCP server (one tool) with structured error responses
- [ ] Configure it via `.mcp.json` using `${ENV_VAR}` for any secret
- [ ] Test all four error categories: `auth`, `not_found`, `rate_limit`, `validation`
- [ ] Verify the empty-result vs access-failure distinction

### Anti-patterns to memorize

- [ ] **AP-6** Generic error messages → structured error fields
- [ ] **AP-7** Silently returning empty for access failures → distinguish access vs empty
- [ ] **AP-8** 18+ tools on one agent → distribute across subagents
- [ ] **AP-9** Hardcoding API keys in `.mcp.json` → `${ENV_VAR}` expansion
- [ ] Vague tool descriptions → detailed with examples and edge cases
- [ ] Write for modifications → use Edit
- [ ] Bash for file ops → use the dedicated tool

### Verify

- [ ] Practice Test 4 — score: ___/10
- [ ] **Phase 1 retrospective:** what's still fuzzy? Note here:
  > _your notes_

---

[Continue to Phase 2 :material-arrow-right:](phase-2-applied.md){ .md-button .md-button--primary }
