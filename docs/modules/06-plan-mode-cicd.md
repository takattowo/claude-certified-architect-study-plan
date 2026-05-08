# Module 6 — Plan Mode, Iteration & CI/CD

<div class="ccaf-module-meta" markdown="0">
  <span class="ccaf-chip ccaf-chip--domain">D3.3 + D3.4 · Claude Code Config</span>
  <span class="ccaf-chip">Weight: part of ~20%</span>
  <span class="ccaf-chip ccaf-chip--time">5–7 hr</span>
  <span class="ccaf-chip ccaf-chip--level">Applied</span>
</div>

## What you'll learn

- When plan mode pays off and when it's overhead
- The TDD cycle as the canonical iterative refinement pattern
- CI flags: `-p`, `--output-format json`, `--json-schema`
- Why same-session self-review is broken and what to do instead
- Message Batches API: when to use, what you get

---

## 1. Plan mode vs direct execution

### Plan mode is for expensive-to-undo work

Use plan mode when:

- Multi-file changes touching many interconnected components
- Architectural decisions that will be hard to reverse
- New feature implementation requiring design choices
- Anywhere a wrong direction wastes hours

Plan mode forces an explicit plan before any code is touched. The model lays out the steps, you approve or revise, then execution begins. Errors get caught at the planning stage, not after a 200-line refactor that was wrong from line 1.

### Direct execution is for cheap work

Skip plan mode when:

- Single-file changes with obvious scope
- Trivial fixes (typo, lint warning, dead branch)
- The right approach is unambiguous

Forcing plan mode on a one-line typo fix wastes a turn and adds friction.

### The decision rule

> **Use plan mode when the cost of a wrong direction exceeds the cost of planning.**

Most architectural refactors: yes. Most bug fixes: no. Many new features: yes (because the design space is open). Many config tweaks: no.

> **Exam rule:** "Always use plan mode" and "never use plan mode" are both wrong. Match to task.

---

## 2. Iterative refinement — the TDD cycle is the canonical pattern

The exam tests three iterative refinement patterns:

1. **TDD cycle:** failing test → implement → verify → refine → repeat
2. **Concrete examples:** show 2–4 examples instead of describing the format abstractly (Module 7 expands)
3. **Interview pattern:** ask clarifying questions before writing code

### Why TDD wins for code generation

| | TDD | "Just implement it" |
|---|---|---|
| Definition of done | Concrete (tests pass) | Vague (looks right?) |
| Catches misunderstanding | Yes (test fails, surface mismatch) | No (model + you both think it's right) |
| Self-correcting | Yes (failing tests force iteration) | No (no signal) |
| Production-grade | Yes | Risky |

### TDD with Claude Code, step by step

```
1. Write the failing test first.
   "Write a test for a function `parse_csv(text: str) -> list[dict]` that
    handles quoted fields, escaped quotes, and empty trailing fields."
2. Run the test. Confirm it fails.
3. Ask Claude to implement the function.
4. Run the test again. Confirm it passes.
5. Add edge case tests. Run. Refine until green.
6. Refactor while keeping tests green.
```

> **Exam rule:** Vague instructions without verification = wrong. TDD cycle = right.

---

## 3. CI/CD integration

### Non-interactive mode — `-p` is required

Claude Code in CI must run non-interactively. The `-p` flag (sometimes called the "print" or "non-interactive" flag) makes that work:

```bash
claude -p "Review the staged diff for bugs. Output a JSON list."
```

Without `-p`, Claude Code expects a TTY and hangs in CI.

### `--output-format json`

Pair with `-p` to get structured output for downstream parsing:

```bash
claude -p "Audit this file" --output-format json
```

You get:

```json
{
  "messages": [...],
  "stop_reason": "end_turn",
  "usage": {...}
}
```

Now your CI script can parse with `jq` instead of regex'ing prose.

### `--json-schema`

Force the output to match a specific JSON schema. Per the [official CLI reference](https://code.claude.com/docs/en/cli-reference) the flag accepts an **inline JSON Schema string** (print mode only):

```bash
claude -p \
  --json-schema '{"type":"object","properties":{"issues":{"type":"array"}},"required":["issues"]}' \
  "Find security issues in src/"
```

For larger schemas, store the JSON in a shell variable or file and pass via command substitution:

```bash
SCHEMA="$(cat schema.json)"
claude -p --json-schema "$SCHEMA" "Find security issues"
```

Output is guaranteed to match the schema. Combined with `tool_use` (Module 7), this is the right way to get structured data.

### CI pipeline pattern

```yaml
# .github/workflows/review.yml
- name: Generate code
  run: |
    claude -p "Implement the failing test in $TEST_FILE" \
      --output-format json > generated.json

- name: Review code (SEPARATE session)
  run: |
    SCHEMA="$(cat review-schema.json)"
    claude -p \
      --json-schema "$SCHEMA" \
      --output-format json \
      "Review the diff in /tmp/diff.patch for bugs. Output JSON." \
      > review.json
```

Note: the review happens in a **separate session**. Critical (next section).

---

## 4. Same-session self-review is broken — use separate sessions

### Why same-session review fails

The reviewer keeps the generator's reasoning in context. It saw why the generator made each choice. It's primed to agree.

This is **confirmation bias by design**. The reviewer rationalizes the generator's choices instead of evaluating them fresh.

### What separate sessions buy you

- Fresh context — no memory of why the generator made each choice
- The reviewer evaluates the **artifact**, not the **reasoning that produced it**
- Far higher hit rate on real bugs

### How to do it right

```bash
# Generator session
claude -p "Implement function X" > generated.py

# Reviewer session — completely separate
echo "Review the file generated.py for bugs and edge cases." | claude -p
```

Or in CI: two separate workflow steps, no shared state, no passed context beyond the artifact itself.

> **Exam rule:** Same-session self-review = always wrong. Separate sessions = right. Even when the convenience cost is real.

---

## 5. Message Batches API — 50% savings, 24-hour window

### What it is

Submit many requests as a batch. Anthropic processes them within 24 hours. You get **50% cost savings** vs synchronous requests.

### Hard limits per batch (from [official docs](https://platform.claude.com/docs/en/docs/build-with-claude/batch-processing))

- **100,000 requests** OR **256 MB** per batch (whichever first)
- `custom_id` must match `^[a-zA-Z0-9_-]{1,64}$` (1–64 chars, alphanumeric + hyphen + underscore)
- **Results retained 29 days** post-creation
- Batches scoped per Workspace
- Each request needs `max_tokens >= 1`
- Most batches finish in well under 24h; the 24h is the worst-case SLA, not the typical wait

### When it fits

| Use Batches for | Don't use Batches for |
|---|---|
| Nightly audits | Blocking PR reviews |
| Weekly compliance scans | Real-time customer responses |
| Bulk data extraction | Anything user-facing under 1 minute |
| Periodic large analyses | Interactive dev work |

The 24-hour window is the constraint. If you can wait, you save half. If you can't, full price.

### Workflow

1. **Submit:** create a batch with N requests, each tagged with a `custom_id` you define.
2. **Wait:** poll status, or wait for completion notification (up to 24h).
3. **Retrieve:** download results, match each back to your `custom_id`.
4. **Reconcile:** integrate results into your downstream system.

```python
batch = client.messages.batches.create(
    requests=[
        {"custom_id": f"file-{i}",
         "params": {"model": "claude-sonnet-4-6", "max_tokens": 1024,
                    "messages": [{"role": "user", "content": f"Audit {f}"}]}}
        for i, f in enumerate(files_to_audit)
    ]
)
# Later
results = client.messages.batches.results(batch.id)
for r in results:
    files_to_audit_dict[r.custom_id].audit_result = r.result
```

> **Exam rule:** Non-urgent + can wait 24h = Batches. Urgent or blocking = sync. Synchronous for nightly audits = wrong (overpaying).

---

## 6. Hands-on walkthrough

### Step 1 — try plan mode vs direct on two contrasting tasks

- [ ] **Task A** (small): "Fix the typo in this comment." → direct execution. Time it.
- [ ] **Task B** (architectural): "Migrate this codebase from CommonJS to ESM." → plan mode. Walk through the plan with Claude, approve before execution.
- [ ] Note the difference in confidence/quality between the two

### Step 2 — TDD cycle in Claude Code

Pick a small function you've been meaning to write. Run TDD:

- [ ] Write the failing test
- [ ] Run it, confirm red
- [ ] Ask Claude to implement
- [ ] Run, confirm green
- [ ] Add an edge case test, run, refine, repeat

### Step 3 — CI run with `-p` and `--json-schema`

Add a CI step that runs Claude on a file and parses structured output:

```yaml
- name: Lint with Claude
  run: |
    SCHEMA="$(cat .github/schemas/lint.json)"
    claude -p \
      --json-schema "$SCHEMA" \
      --output-format json \
      "Check src/api/handler.ts for unhandled error paths. Output JSON." \
      > lint.json
    jq '.issues' lint.json
```

- [ ] Verify CI run completes without hanging
- [ ] Confirm output matches schema
- [ ] Verify failure mode if you remove `-p` (it'll hang waiting for TTY)

### Step 4 — separate-session code review

Build a 2-job CI workflow:

```yaml
jobs:
  generate:
    steps:
      - name: Generate impl
        run: claude -p "Implement test_X" > impl.py

  review:
    needs: generate
    steps:
      - name: Review (fresh session)
        run: claude -p "Review impl.py for bugs" > review.json
```

- [ ] Run with same-session review (paste both into one Claude invocation)
- [ ] Run with separate sessions (two invocations)
- [ ] Compare the bug-detection rate on a known-buggy fixture

### Step 5 — Batches API

Submit a batch of 10 small tasks:

```python
import anthropic
client = anthropic.Anthropic()

batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"req-{i}",
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": f"Summarize: {text[i]}"}],
            },
        }
        for i in range(10)
    ]
)
print(batch.id)
```

- [ ] Check status, wait for completion
- [ ] Retrieve results, match by `custom_id`
- [ ] Compare cost vs synchronous (50% savings)

---

## 7. Anti-patterns deep-dive

### AP-12 — Same-session self-review (Critical)

The most-tested anti-pattern in Domain 3. **Always wrong.** The reviewer carries generator reasoning, biases toward "looks fine."

### Interactive mode in CI

Forgetting `-p` means CI hangs on the first call. Always use `-p` for non-interactive runs.

### Synchronous for non-urgent

Paying full price for nightly audit work that could wait 24 hours.

### Always-or-never plan mode

Both extremes are wrong. Match to task complexity.

### Vague instructions without verification

"Make it better" with no test = no signal. Always have a verification step.

---

## 8. Best practices

- **Plan mode for any change >1 file or >50 lines.** Probably worth it. Below that, direct.
- **TDD for anything you'll commit.** Tests are non-optional documentation of intent.
- **`-p` everywhere in CI.** Non-negotiable.
- **Separate sessions for review.** Every time. Even when it feels redundant.
- **Batches for everything that can wait.** 50% off is 50% off.

---

## 9. Common pitfalls

- **Plan mode planning the plan.** If the plan is itself trivial, you've wasted a step.
- **TDD without running the test in step 2.** Confirming the test actually fails is the part people skip.
- **Forgetting `--output-format json`** with `-p`, then parsing prose with regex. Friction nobody needs.
- **`custom_id` collisions** in Batches — make them deterministic and unique.

---

## 10. Verification

- [ ] Re-attempt the **Claude Code Config** filter on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) — focus on plan mode / CI/CD / Batches items
- [ ] Can you write the TDD cycle in 5 lines from memory?
- [ ] Can you list all three CI flags and what each does?
- [ ] Can you state the Batches "when to use" rule in one sentence?

---

## 11. Further reading

- [Domain 3 source page](https://claudecertifications.com/claude-certified-architect/domains/claude-code-config)
- [Anti-pattern AP-12](../anti-patterns.md#ap-12-same-session-self-review-in-cicd-pipelines)
- [Scenario 5 — Claude Code for CI/CD](../scenarios.md#scenario-5-claude-code-for-cicd)

[Continue to Module 7 — Prompt Engineering :material-arrow-right:](07-prompt-engineering.md){ .md-button .md-button--primary }
