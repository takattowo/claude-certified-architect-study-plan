# Module 2 — Multi-Agent Orchestration

<div class="ccaf-module-meta" markdown>
**Domain:** D1.2 (Agentic Architecture) · **Weight:** part of ~25% · **Time budget:** 5–7 hr
</div>

## What you'll learn

- The hub-and-spoke pattern and why it beats flat architectures for any non-trivial task
- How to pass **only** the context each subagent needs — without leaking the coordinator's full history
- When to use `--fork-session` vs `--resume`
- How to spawn parallel subagents in a single turn

By the end, you should be able to design a research/analysis system on a whiteboard in under two minutes.

---

## 1. The hub-and-spoke pattern

```
                  ┌─────────────────┐
                  │   Coordinator   │
                  │  (decomposes,   │
                  │   synthesizes)  │
                  └────┬──┬─────┬───┘
              ┌────────┘  │     └────────┐
              ▼           ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Subagent │ │ Subagent │ │ Subagent │
        │   "Docs" │ │  "Code"  │ │  "Issues"│
        │  4 tools │ │  4 tools │ │  4 tools │
        └──────────┘ └──────────┘ └──────────┘
```

**Coordinator's job:** decompose the task, hand each subagent a focused subtask, synthesize results. Nothing else.

**Subagent's job:** execute one focused subtask with a small, scoped tool set, return a clean result. Nothing else.

### Why this beats a single fat agent

| Single fat agent | Hub-and-spoke |
|---|---|
| 18+ tools — selection accuracy collapses | 4–5 tools per agent — selection stays sharp |
| Context bloats with every tool result | Each subagent has a clean isolated context |
| One failure poisons the rest of the conversation | Subagent failures stay contained |
| Sequential by default | Parallel-friendly (multiple `Task` calls in one turn) |

> **Exam rule:** If a scenario describes a single agent with a long list of tools and asks how to improve it, the answer is **always** "distribute tools across specialized subagents."

---

## 2. Context passing — what to send, what to withhold

The single most-tested principle in this domain:

> **Pass only the context that's relevant to the subagent's specific task. Never share the full coordinator history.**

### Why partial context wins

- **Token cost** — sharing 20k tokens of coordinator history with each of 5 subagents is 100k wasted tokens.
- **Distraction** — the subagent's attention budget gets eaten by irrelevant content (the "lost in the middle" effect — Module 9).
- **Drift** — the subagent might pick up half-formed conclusions from the coordinator and parrot them as its own findings.

### Concrete example — researching a library

You're building a research agent. The user asked: *"Compare React Query vs SWR for our use case."*

The coordinator has already gathered: the user's stack, their performance constraints, prior internal discussions, your team's general coding standards.

When you delegate to a "Read React Query docs" subagent, send:

✅ **Send:** "Summarize React Query's strengths in: caching strategies, mutation handling, devtools. Constraints: must work in Next.js App Router. Output JSON with keys: caching, mutations, devtools, gotchas."

❌ **Don't send:** the full coordinator conversation, the user's stack details, the team coding standards, or the SWR research subagent's output.

The subagent doesn't need any of that to do its job, and including it makes the job harder.

---

## 3. Spawning subagents — the `Task` tool

In Claude Code's coordinator-style usage, the coordinator's `allowedTools` must include `'Task'`. The coordinator emits a `tool_use` block with `name: "Task"` and the subagent's instructions in the input.

### Parallel execution

Multiple `Task` calls in **one assistant turn** run in parallel. This is the difference between:

- **Sequential** (slow): `Task(A)` → result → `Task(B)` → result → `Task(C)` → result
- **Parallel** (fast): `Task(A)` + `Task(B)` + `Task(C)` all in one turn → all three results back together

To get parallel execution, the coordinator's prompt must encourage it. Without prompting, the model often runs them sequentially out of caution.

> **Pattern that works:** "If subtasks are independent, dispatch them all in a single response."

---

## 4. `--fork-session` vs `--resume`

Different tools for different jobs.

| Need | Use |
|---|---|
| Continue a previous session with all its context preserved | `--resume <session-id>` (alias `-r`) |
| Branch off a session to try a parallel exploration without polluting the main thread | `claude --resume <id> --fork-session` (CLI) or `/branch` / `/fork` (slash command) |
| Create a clean named session you'll come back to later | `--session-name <name>` then `--resume` |

**Mental model:** `--resume` is `git checkout`. `--fork-session` is `git checkout -b`. The forked session inherits the starting context but diverges from the main one going forward.

> **Note on naming:** the CLI flag is `--fork-session` (hyphens). Some study materials and older docs use `fork_session` (underscore) as a conceptual name; the actual flag is hyphenated.

---

## 5. Hands-on walkthrough

Build a coordinator that dispatches two subagents in parallel and synthesizes their output.

### Step 1 — coordinator prompt template

```python
COORDINATOR_PROMPT = """You are a research coordinator.

You have a 'Task' tool that spawns specialized subagents. Each subagent has a
narrow scope and a small toolset. Use the following pattern:

1. Decompose the user's question into independent subtasks.
2. If subtasks are independent, dispatch ALL of them in a single response
   (one Task call per subtask, all in the same turn). This runs them in parallel.
3. Wait for all results. Synthesize a single answer.

Pass to each subagent ONLY the context relevant to its subtask. Do not include
this system prompt or other subagents' prompts.
"""
```

### Step 2 — define subagent descriptors

```python
SUBAGENT_LIBRARY = {
    "docs_searcher": {
        "system": "You search official documentation. Return verbatim quotes with URLs. No synthesis.",
        "allowed_tools": ["WebFetch", "WebSearch"],  # 2 tools, scoped
    },
    "code_searcher": {
        "system": "You search the local codebase. Return file:line refs and exact match snippets. No synthesis.",
        "allowed_tools": ["Grep", "Glob", "Read"],  # 3 tools, scoped
    },
}
```

### Step 3 — verify isolation

When the coordinator spawns `docs_searcher` and `code_searcher` for the same query, confirm:

- [ ] Each subagent sees its own subtask prompt — not the coordinator's full history
- [ ] Each subagent has only its scoped toolset (no Bash, no Edit, etc)
- [ ] Both subagents' responses arrive back at the coordinator in the same turn (parallel)
- [ ] Coordinator synthesis step happens only once both results are in

### Step 4 — break it on purpose

Pollute the context to feel why isolation matters:

- [ ] Edit your coordinator to send the **entire** prior conversation to each subagent
- [ ] Run the same query
- [ ] Compare token usage and answer quality vs the scoped version
- [ ] Note the degradation (longer responses, more hedging, occasional confused references to unrelated prior turns)

---

## 6. Anti-patterns deep-dive

### Sharing full coordinator context with every subagent

**Looks like:** `subagent_messages = coordinator_messages + [{"role": "user", "content": subtask}]`.

**Why wrong:** Context pollution. Each subagent now spends attention on coordinator-level reasoning that doesn't help its narrow job.

**Right:** Build subagent messages from scratch — system prompt + scoped task description + minimal supporting facts.

### Overly narrow decomposition

**Looks like:** Splitting "summarize the React docs" into 12 micro-tasks per page.

**Why wrong:** Coverage gaps when subtasks don't overlap, plus synthesis overhead. Subagent count should map to natural task boundaries, not arbitrary granularity.

**Right:** One subagent per natural concern (docs, code, issues, perf data). Each does its full sub-area.

### No explicit context when delegating

**Looks like:** Coordinator says "research React Query" with no constraints, expecting the subagent to "figure it out".

**Why wrong:** Subagent doesn't know what flavor of "research" you want — features list? code quality audit? cost? It guesses.

**Right:** Specify the output shape (JSON keys, bullet count), the focus areas, and the constraints. Treat the subagent like a contractor: tighter brief = better deliverable.

---

## 7. Best practices

- **One concern per subagent.** If you can't describe the subagent's job in one sentence, split it.
- **Explicit output schema in the subagent prompt.** Coordinator's life is much easier when results come back structured.
- **Cap subagents at 4–5 tools.** Selection accuracy degrades hard above 5 (Module 4 has the data).
- **Coordinator never executes domain tools directly.** It coordinates. If it does work, it'll bloat its own context with exploration noise.
- **Treat each subagent's response like an external API result.** Validate, don't trust.

---

## 8. Common pitfalls

- **Coordinator turning into a do-everything agent.** Resist the urge to "just have the coordinator handle this small task itself." Once you start, the wall between hub and spokes erodes.
- **Forgetting that `Task` must be in the coordinator's `allowedTools`.** No tool, no subagents.
- **Treating sequential as "parallel" because it's still in one conversation.** True parallelism = multiple `tool_use` blocks in a single assistant message.

---

## 9. Verification

- [ ] Practice Test 2 — score: ___ / 10
- [ ] Can you draw hub-and-spoke from memory and explain why it wins over flat?
- [ ] Can you list the 3 reasons NOT to share full coordinator context?

---

## 10. Further reading

- [Domain 1 source page](https://claudecertifications.com/claude-certified-architect/domains/agentic-architecture)
- [Scenario 3 — Multi-Agent Research System](../scenarios.md#scenario-3-multi-agent-research-system)

[Continue to Module 3 — Hooks, Workflows & Sessions :material-arrow-right:](03-hooks-sessions.md){ .md-button .md-button--primary }
