# Module 4 — Tool Design & MCP Integration

<div class="ccaf-module-meta" markdown>
**Domain:** D2 (full) · **Weight:** ~20% · **Time budget:** 6–8 hr
</div>

## What you'll learn

- How to write tool descriptions that the model uses correctly
- Structured error responses — the four required fields
- The 4–5 tools per agent rule and how to distribute the rest
- `.mcp.json` vs `~/.claude.json`, `${ENV_VAR}` for secrets
- All six built-in tools and when to use each

This domain has the most "always wrong" answers. If you internalize the rules here, you can eliminate distractors on sight.

---

## 1. Writing tool descriptions the model can use

The model decides whether to call a tool based on:

1. The tool name
2. The tool description
3. The input schema

That's it. If your description is vague, your tool will be misused or ignored.

### What a good description includes

- **One-sentence purpose statement.** What this tool does in plain language.
- **Input specifications.** Types, formats, ranges, accepted values, required vs optional.
- **Concrete input examples.** "city: 'Hanoi'", not just "city: string".
- **Edge cases and boundaries.** What happens if input X is out of range? What if Y is empty?
- **When NOT to use this tool.** Explicit negative space.

### Bad vs good — same tool

❌ Bad:

```json
{
  "name": "search_customers",
  "description": "Searches for customers.",
  "input_schema": {
    "type": "object",
    "properties": {"query": {"type": "string"}},
    "required": ["query"]
  }
}
```

✅ Good:

```json
{
  "name": "search_customers",
  "description": "Search active customer records by name, email, or customer ID. Returns up to 50 matches sorted by relevance. Use for: looking up an existing customer by partial name or email. Do NOT use for: bulk export (use export_customers), prospects (use search_prospects), or matching by phone number (not supported).",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Free-text search. Examples: 'jane@acme.com', 'Jane Smith', 'CUS-12345'. Min length 3.",
        "minLength": 3
      },
      "include_inactive": {
        "type": "boolean",
        "description": "If true, include cancelled/churned customers. Default false.",
        "default": false
      }
    },
    "required": ["query"]
  }
}
```

> **Exam rule:** Whenever a question asks "which tool description is correct?", the right answer always has the **most detailed** description with input formats, examples, edge cases, and when-not-to-use. Brevity is wrong here.

---

## 2. Structured error responses — the four required fields

When a tool fails, return a structured error so the agent can decide what to do next.

### The four fields

| Field | Type | Purpose |
|---|---|---|
| `isError` | bool | Was this an error or a normal result? |
| `errorCategory` | string enum | Classification: `auth`, `not_found`, `rate_limit`, `timeout`, `validation` |
| `isRetryable` | bool | Should the agent retry, or escalate/give up? |
| `context` | object | What was attempted, what failed, any details that help the agent decide next steps |

### Example — well-structured error

```json
{
  "isError": true,
  "errorCategory": "rate_limit",
  "isRetryable": true,
  "context": {
    "attempted": "search_customers",
    "query": "Jane Smith",
    "retry_after_seconds": 60,
    "remaining_quota": 0
  }
}
```

The agent now knows: it was a rate limit, retry after 60s, quota is exhausted.

### Access failure vs empty result — exam favorite

The single most-tested distinction in Domain 2:

**Empty result** — you successfully checked, found nothing.
```json
{ "isError": false, "results": [] }
```

**Access failure** — you couldn't check at all.
```json
{ "isError": true, "errorCategory": "auth", "isRetryable": false,
  "context": { "attempted": "search_customers", "reason": "token expired" } }
```

> **Exam rule:** A tool that silently returns `[]` on access failure is **always wrong**. The agent thinks "no matches", makes a bad decision (e.g. tells the customer "no account exists" when actually we couldn't even check). Distinguish.

### Anti-pattern — generic error message

```json
{ "isError": true, "message": "Operation failed" }
```

What does the agent do with this? Retry? Escalate? Give up? It has to guess. Guesses produce bad outcomes. Be specific.

---

## 3. Tool distribution — the 4–5 rule

Tool selection accuracy degrades with tool count. The exam gives you the numbers:

| Tools per agent | Selection accuracy |
|---|---|
| 4–5 | Optimal |
| 6–10 | Notable degradation |
| 11+ | Significant errors |
| 18+ | Selection collapses |

### What to do when you have many tools

Distribute across specialized subagents (Module 2). Pattern:

```
Coordinator (4 tools: Task, Read, Grep, plan)
├── Search subagent (3 tools: Grep, Glob, Read)
├── Edit subagent (3 tools: Read, Edit, Write)
└── Test subagent (4 tools: Read, Bash, Grep, Edit)
```

Total tools across the system: many. Tools per agent: 3–4. Selection stays sharp.

### `tool_choice` parameter

Four values per the [official docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools):

| Value | Behavior | Use when |
|---|---|---|
| `{"type": "auto"}` | Model decides whether to use any tool | Default when tools are provided. Open-ended task. |
| `{"type": "any"}` | Model **must** use a tool, picks which | Task definitely requires a tool call (e.g. "look up X") |
| `{"type": "tool", "name": "X"}` | Model must use tool X | Structured extraction (Module 7) |
| `{"type": "none"}` | Model **cannot** use any tool | Default when no tools provided; or to suppress tool use mid-conversation |

**Compatibility note:** with extended thinking, only `auto` and `none` are supported. `any` and forced-tool will return a 400.

> **Exam rule:** When the task is to extract structured data, force a specific tool. When the task is open-ended, leave it on `auto`.

---

## 4. MCP configuration

### MCP server scopes — three levels (from [official docs](https://code.claude.com/docs/en/mcp))

| Scope | Stored in | Shared with team |
|---|---|---|
| **Local** | `~/.claude.json` (default; project-bound) | No |
| **Project** | `.mcp.json` in project root | **Yes** — commit it |
| **User** | `~/.claude.json` (cross-project) | No |

**Precedence:** Local > Project > User > Plugin > claude.ai connectors.

Project-level (`.mcp.json`) is the team-shared config. Local and User scopes both live in `~/.claude.json` — Local is per-project, User is global across all your projects.

### Secrets — env-var expansion

**Always.** Never hardcode. Two forms supported:

- `${VAR}` — expands to the value of `VAR`
- `${VAR:-default}` — expands to `VAR` if set, otherwise to `default`

Expansion works in `command`, `args`, `env`, `url`, and `headers`. Plain `$VAR` is **not** supported. If a required var is unset and has no default, parsing fails.

✅ Right:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "stripe-mcp-server",
      "env": {
        "STRIPE_API_KEY": "${STRIPE_API_KEY}"
      }
    }
  }
}
```

❌ Wrong:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "stripe-mcp-server",
      "env": {
        "STRIPE_API_KEY": "sk_live_AbCd1234..."
      }
    }
  }
}
```

`.mcp.json` is committed to git. A hardcoded key gets leaked the second the repo gets pushed (or cloned by anyone who shouldn't have it).

> **Exam rule:** Any answer that hardcodes API keys in `.mcp.json` is wrong. Use `${ENV_VAR}`. Always.

### MCP server capabilities — three things they can expose

1. **Tools** — functions Claude can call (e.g. `list_invoices`, `create_subscription`)
2. **Resources** — static data Claude can read (e.g. `pricing-policy.md`, `customer-handbook.txt`)
3. **Prompts** — reusable prompt templates the user can invoke (e.g. `/onboard-new-customer`)

A single MCP server can expose any combination.

---

## 5. The six built-in tools

| Tool | Use for | Don't use for |
|---|---|---|
| **Read** | Examine file contents | Searching across many files (use Grep) |
| **Write** | Create new files | Modifying existing files (use Edit) |
| **Edit** | Targeted modifications to existing files | Creating new files (use Write) |
| **Bash** | Shell commands, system ops | File ops when a dedicated tool exists |
| **Grep** | Search file **contents** by regex | Finding files by name (use Glob) |
| **Glob** | Find files by **name pattern** | Searching contents (use Grep) |

### Three exam-critical distinctions

1. **Write vs Edit:** Write creates new files (or replaces wholesale). Edit modifies existing files preserving the rest. Using Write to "modify" a file replaces the **entire** file — destructive. Use Edit.

2. **Bash vs purpose-built:** If you can do it with Read/Write/Edit/Grep/Glob, do it with those. Bash for file ops is wrong because it bypasses the model's structured understanding of the change.

3. **Grep vs Glob:** Grep searches **inside** files. Glob finds **filenames**. "Find all `.tsx` files" → Glob. "Find all files containing 'useEffect'" → Grep.

> **Exam rule:** Whenever a scenario shows an agent using Bash for a file operation that has a dedicated tool, the right answer is the dedicated tool. Always.

---

## 6. Hands-on walkthrough

### Step 1 — write a high-quality tool description

Take an existing CRUD endpoint in your codebase. Wrap it as a Claude tool. Write the description **above** the level of "looks fine"—include:

- One-line purpose
- Required inputs with types and example values
- Optional inputs with defaults
- At least one edge case
- One "do NOT use for" line

- [ ] Description includes all five elements

### Step 2 — implement structured errors

Add error handling to that tool that returns the four-field shape:

```python
def search_customers(query: str, include_inactive: bool = False) -> dict:
    try:
        if len(query) < 3:
            return {
                "isError": True,
                "errorCategory": "validation",
                "isRetryable": False,
                "context": {"reason": "query too short", "min_length": 3, "actual": len(query)},
            }
        results = db.search(query, include_inactive=include_inactive)
        return {"isError": False, "results": results}  # may be []
    except AuthError as e:
        return {
            "isError": True, "errorCategory": "auth",
            "isRetryable": False, "context": {"reason": str(e)},
        }
    except RateLimitError as e:
        return {
            "isError": True, "errorCategory": "rate_limit",
            "isRetryable": True, "context": {"retry_after_seconds": e.retry_after},
        }
    except TimeoutError:
        return {
            "isError": True, "errorCategory": "timeout",
            "isRetryable": True, "context": {"timeout_seconds": 5},
        }
```

- [ ] At least 4 of the 5 error categories produce the right shape
- [ ] Empty results return `isError: false` (not `true`)
- [ ] Access failures are clearly distinguishable from empty results

### Step 3 — test the empty-vs-failure distinction

Run the agent with two inputs:

1. A query that legitimately matches nothing → expect `{isError: false, results: []}`
2. A query while the DB is down → expect `{isError: true, errorCategory: "timeout", ...}` (or whichever of the 5 categories fits the failure mode)

- [ ] Agent's downstream behavior differs between the two (it should — one says "no customer found", the other says "I couldn't check, escalating")

### Step 4 — write a project `.mcp.json`

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp-server"],
      "env": { "STRIPE_API_KEY": "${STRIPE_API_KEY}" }
    },
    "internal-docs": {
      "command": "node",
      "args": ["./tools/docs-mcp-server.js"]
    }
  }
}
```

- [ ] Uses `${ENV_VAR}` for any secret
- [ ] No keys committed
- [ ] Add to git, push, verify no secret leaked

### Step 5 — distribute tools

Take an agent in your codebase that has 8+ tools. Refactor:

- [ ] Identify natural concern groupings
- [ ] Create 2–3 specialized subagents with 3–4 tools each
- [ ] Coordinator keeps `Task` + 1–2 utility tools
- [ ] Verify selection accuracy improves on a small benchmark of test prompts

---

## 7. Anti-patterns deep-dive

### AP-6 — Generic error messages (Critical)

`"Operation failed"` is useless. The agent has no signal for retry/escalate/give-up.

### AP-7 — Silent empty for access failure (Critical)

The classic. A query timeout returns `[]`, the agent tells the customer "no matching account", customer is now confused and angry. Distinguish.

### AP-8 — 18+ tools on one agent (High)

Selection accuracy collapses. Distribute across specialized subagents. There is no exception to this rule on the exam.

### AP-9 — Hardcoded keys in `.mcp.json` (Critical)

Treat `.mcp.json` as a public file. If you wouldn't tweet it, don't put it in there. Use `${ENV_VAR}`.

### Vague descriptions

"Searches for customers" is the canonical bad description. Be exhaustively specific.

### Write for modifications

Write replaces the **entire** file. Use Edit for targeted changes.

### Bash for file ops

Use the purpose-built tool. Bash is for things that don't have one.

---

## 8. Best practices

- **Treat tool descriptions as documentation for the model.** More detail wins.
- **Give every tool a "when not to use" line.** Negative space is as instructive as positive.
- **Always return the four-field error shape.** Even for tools that "rarely fail."
- **Cap each agent at 4–5 tools.** Hard rule.
- **`${ENV_VAR}` for everything secret.** No exceptions.
- **Write vs Edit vs Bash:** smallest, most-specific tool wins.

---

## 9. Common pitfalls

- **Returning a string error message instead of the four-field object.** The agent has no structured signal.
- **Forgetting `tool_use_id` echo** when returning results (Module 1's gotcha).
- **Adding the seventh tool because "this one's just a small helper."** It isn't. Distribute.
- **Editing `.mcp.json` and committing the key by accident.** Use a pre-commit hook to block secrets.

---

## 10. Verification

- [ ] Answer the **4 Tool Design & MCP questions** on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) (filter: Tool Design & MCP). Aim ≥ 3 / 4 right
- [ ] Can you write the four-field error shape from memory?
- [ ] Can you list all six built-in tools and one-sentence "use for" each?
- [ ] **Phase 1 retrospective:** what's still fuzzy? Note here:
  > _your notes_

---

## 11. Further reading

- [Domain 2 source page](https://claudecertifications.com/claude-certified-architect/domains/tool-design-mcp)
- [Anti-patterns AP-6 through AP-9](../anti-patterns.md#domain-2-tool-design-mcp-4)
- [Scenario 4 — Developer Productivity with Claude](../scenarios.md#scenario-4-developer-productivity-with-claude)

[Continue to Phase 2 — Module 5 :material-arrow-right:](05-claude-code-config.md){ .md-button .md-button--primary }
