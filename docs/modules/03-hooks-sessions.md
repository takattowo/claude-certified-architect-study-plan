# Module 3 — Hooks, Workflows & Sessions

<div class="ccaf-module-meta" markdown>
**Domains:** D1.3 + D1.4 · **Weight:** part of ~25% · **Time budget:** 5–7 hr
</div>

## What you'll learn

- The deterministic-vs-probabilistic split and why hooks are the answer for critical rules
- PreToolUse vs PostToolUse — when each fires, what each can do
- The four valid escalation triggers (and the two invalid ones the exam tries to slip past you)
- Session ops: `--resume`, `fork_session`, `--session-name`
- Prompt chaining vs dynamic adaptive decomposition

---

## 1. Hooks vs prompts — the determinism split

| | Hooks | Prompts |
|---|---|---|
| Reliability | 100%. Code runs every time. | Probabilistic. Model can ignore. |
| Use for | Critical business rules, compliance, security | Style, tone, soft preferences |
| Failure mode | Hook crash = visible exception | Prompt ignored = silent compliance failure |
| Fix when wrong | Edit code, redeploy | Rephrase and pray |

> **Exam rule:** If a question describes a critical rule (refund cap, PII redaction, SLA enforcement, anything compliance-related), the right answer is **always** a hook. Prompt-only enforcement of critical rules is **always** wrong.

### Concrete example — refund cap

You're building a customer support agent. Policy: no refund over $500 without a human approving.

**Wrong:**

```text
SYSTEM PROMPT: "Never approve refunds over $500. Always escalate those to a human."
```

The model will follow this 99% of the time. The 1% where it doesn't, you're handing out unauthorized refunds.

**Right:**

```python
# PostToolUse hook for the 'process_refund' tool
def post_process_refund(tool_input, tool_output):
    if tool_input["amount_usd"] > 500:
        raise HookBlockedError(
            "Refunds over $500 require human approval. Escalating."
        )
    return tool_output
```

Now the rule is enforced 100% of the time. The model can't bypass it even if it tries.

---

## 2. The hook event catalog

Claude Code emits many events you can hook into. The two the exam tests heavily are `PreToolUse` and `PostToolUse`. The full list (from the [official hooks docs](https://code.claude.com/docs/en/hooks)) includes:

| Lifecycle | Tool | Prompt | Subagent | Compaction | Files & Worktrees | Misc |
|---|---|---|---|---|---|---|
| `SessionStart`, `Setup`, `SessionEnd` | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `PermissionRequest`, `PermissionDenied` | `UserPromptSubmit`, `UserPromptExpansion`, `InstructionsLoaded` | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted` | `PreCompact`, `PostCompact` | `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged` | `Stop`, `StopFailure`, `Notification`, `TeammateIdle`, `ConfigChange`, `Elicitation`, `ElicitationResult` |

Most production work needs `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, and `SessionStart`. Knowing the full catalog is useful but the exam focuses on `PreToolUse` / `PostToolUse`.

### PreToolUse — fires **before** the tool executes

Powers:

- Block the call entirely (raise an exception or return a sentinel)
- Mutate the tool's input arguments
- Add validation (type checks, range checks, allow-list checks)
- Log the intent for audit before any side effect

Use when: the call could do something bad. You want to stop or sanitize it before it runs.

### PostToolUse — fires **after** the tool executes

Powers:

- Mutate the tool's output before the model sees it
- Normalize / redact / truncate the result
- Trigger side effects (audit log, notification, metrics)
- Block the *result* from being used (refund example above — the call already succeeded but we reject before returning to the agent)

Use when: the tool ran but you need to control what the model sees, or trigger downstream effects.

### Choosing between them

| Goal | Hook |
|---|---|
| Reject a tool call that violates policy | PreToolUse |
| Sanitize PII out of a response | PostToolUse |
| Audit every call regardless of outcome | Both, with logging |
| Enforce a result-based rule (e.g. "no refund over $500") | PostToolUse — you need the result to evaluate |

---

## 3. Escalation triggers — the exam's favorite trap

### Valid triggers — escalate to a human when

1. **Explicit customer request.** "I want to talk to a person." Always honor.
2. **Policy gap.** No rule covers the situation. Don't make one up.
3. **Capability limit.** The agent can't do the action (e.g. issue a wire transfer).
4. **Business threshold.** The action exceeds a configured limit ($500 refund cap, > 100 records bulk delete, etc).
5. **Repeated failures after recovery attempts.** Tried the recovery path twice, still failing.

### Invalid triggers — these are wrong-answer bait on the exam

1. **Sentiment.** "Customer sounds angry → escalate." Sentiment is not task complexity. An angry customer with a simple request still gets the simple resolution.
2. **Self-reported model confidence.** "Claude says it's only 60% confident → escalate." Model confidence is poorly calibrated. Don't make routing decisions on it.

> **Exam rule:** Anywhere "escalate based on sentiment" or "escalate based on confidence score" appears, it's the wrong answer. Pick the structured trigger instead.

---

## 4. Session operations

### `--resume <session-name>`

Continues a previous session **with all its context preserved**. Use when:

- Picking up a multi-day investigation tomorrow
- Coming back to a long-running refactor

### `fork_session`

Creates a **branch** of the current session. Inherits context up to the fork point, then diverges. Use when:

- "What if we tried this other approach?" exploration
- Running a parallel hypothesis without polluting the main thread
- Splitting one investigation into two (e.g. "explore A in this fork, B in another")

### `--session-name <name>`

Names a session for later resumption. Use whenever you'll come back to the work. Naming costs nothing; finding an unnamed session later costs hours.

### Stale context — the long-session problem

In sessions that span hours/days:

- The model accumulates exploration noise that no longer informs the current task
- Important early decisions get buried by recent volume (the lost-in-the-middle effect — Module 9)
- The model may reference outdated state ("the file we were editing earlier" — but the file has since changed)

**Mitigation:**

- Use `/compact` (Module 10) to compress history
- Move concrete state to a scratchpad file the agent re-reads each turn
- For large new sub-tasks, `fork_session` rather than continuing

---

## 5. Task decomposition — chain vs dynamic

### Prompt chaining — for predictable, linear tasks

A static sequence: Step 1 → Step 2 → Step 3. Each step's input depends only on the prior step's output.

Good fits: CSV → enrich → write to DB. Translate → summarize → tweet. Forms with known fields.

```
[Read CSV] → [Enrich rows] → [Validate] → [Write DB]
```

Failure mode: if step 2's output is unexpected, the chain doesn't adapt. It just feeds garbage forward.

### Dynamic adaptive decomposition — for unpredictable tasks

The agent decides what's next based on what it just learned. The shape of the task graph is discovered at runtime.

Good fits: research, debugging, customer support resolution. Anywhere "next step depends on what we found".

```
[Investigate symptom] → ?
   ├─ If A: [check logs] → [propose fix]
   ├─ If B: [check config] → [propose fix]
   └─ If C: [escalate to human]
```

> **Exam rule:** Static chains for adaptive tasks = wrong. Dynamic decomposition for predictable tasks = also wrong (overkill and brittle). Match the structure to the task's predictability.

---

## 6. Hands-on walkthrough

### Step 1 — author a PostToolUse hook

In your Claude Code settings, add a hook that blocks dangerous Bash commands:

```jsonc
// ~/.claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": { "tool_name": "Bash" },
        "command": "python C:/Users/<you>/.claude/hooks/block_dangerous.py",
        "blocking": true
      }
    ]
  }
}
```

```python
# block_dangerous.py
import json, sys, re

payload = json.loads(sys.stdin.read())
cmd = payload["tool_input"].get("command", "")

DANGEROUS = [r"\brm\s+-rf\s+/", r"\bsudo\s+rm\b", r"\bmkfs\.", r":\(\)\s*\{\s*:\|:&"]
for pat in DANGEROUS:
    if re.search(pat, cmd):
        print(json.dumps({"block": True, "reason": f"Blocked by pattern: {pat}"}))
        sys.exit(2)

print(json.dumps({"block": False}))
```

### Step 2 — verify the hook fires

- [ ] Ask Claude Code to run `rm -rf /` (it would refuse on its own, but prove the hook also stops it)
- [ ] Confirm the block message appears and no command executed
- [ ] Try a benign command (`ls`) and confirm it goes through

### Step 3 — sessions

- [ ] Start Claude Code with `--session-name my-test`
- [ ] Have a short conversation
- [ ] Exit, restart with `--resume my-test`, confirm context preserved
- [ ] In the resumed session, fork: `/fork side-experiment` (or equivalent in your version)
- [ ] Diverge in the fork, return to main, confirm main thread unchanged

### Step 4 — escalation logic

Implement a `process_refund` tool with a PostToolUse hook that escalates over $500:

```python
def post_process_refund(tool_input, tool_output):
    amount = tool_input.get("amount_usd", 0)
    if amount > 500:
        return {
            "status": "escalated",
            "reason": "business_threshold",
            "threshold": 500,
            "actual": amount,
            "next_action": "human_review_queue",
        }
    return tool_output
```

- [ ] Verify a $300 refund passes through
- [ ] Verify a $750 refund escalates with the structured reason
- [ ] Confirm sentiment (angry customer wording) does NOT trigger escalation by itself

---

## 7. Anti-patterns deep-dive

### AP-3 — Prompt-based enforcement for critical rules (Critical)

Already covered above. Memorize: critical rule = hook. Always. No exceptions.

### AP-4 — Sentiment-based escalation (High)

**Trap on the exam:** "The customer's message tone is angry. The agent escalates." Sounds reasonable. It's wrong.

**Why:** Sentiment ≠ complexity. Angry doesn't mean the bot can't solve it. Sentiment-based routing fills your queue with easily-solvable angry tickets and leaves complex calm tickets stuck.

**Right:** Escalate on the **structured triggers** in section 3.

### AP-5 — Self-reported confidence (High)

**Trap:** "Escalate when the model's confidence is below 70%."

**Why wrong:** Model confidence scores are not well-calibrated. They drift across model versions, prompts, and topics. Production decisions on poorly calibrated signals are noise.

**Right:** Use structured criteria you can validate (output schema, threshold checks, programmatic verification).

### Static chain for adaptive task

**Looks like:** A 6-step prompt chain that handles "any customer support question."

**Why wrong:** Customer support is the canonical adaptive task. The chain breaks at step 2 the first time a customer says something the chain didn't anticipate.

**Right:** Dynamic decomposition with a coordinator that picks the next step.

---

## 8. Best practices

- **Hook every critical rule.** If you'd lose your job over a violation, hook it. Don't trust the prompt.
- **Log every hook decision.** Audit-grade logging for compliance-relevant hooks.
- **Name your sessions.** Even short ones. Future-you will thank you.
- **Compact aggressively in long sessions.** `/compact` is free; lost-in-the-middle is expensive.
- **Pick chain or dynamic deliberately.** Defaulting to whichever is easier to write is how you get the wrong tool for the job.

---

## 9. Common pitfalls

- **Hook that doesn't actually block** because the matcher pattern is wrong (e.g. matches `Bash` but the agent uses `bash` from a different transport)
- **Confusing "session" with "conversation"** — sessions persist across restarts when named; conversations are in-memory only
- **Forking when you meant to resume**, ending up with a divergent thread you don't realize is divergent until later

---

## 10. Verification

- [ ] Practice Test 3 — score: ___ / 10
- [ ] Can you list all 5 valid escalation triggers and both invalid ones?
- [ ] Can you write a one-line decision rule for hook vs prompt?
- [ ] Can you explain when to fork vs resume in one sentence each?

---

## 11. Further reading

- [Domain 1 source page](https://claudecertifications.com/claude-certified-architect/domains/agentic-architecture)
- [Anti-patterns AP-3, AP-4, AP-5](../anti-patterns.md#domain-1-agentic-architecture-5)
- [Scenario 1 — Customer Support Resolution Agent](../scenarios.md#scenario-1-customer-support-resolution-agent)

[Continue to Module 4 — Tool Design & MCP :material-arrow-right:](04-tool-design-mcp.md){ .md-button .md-button--primary }
