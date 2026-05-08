# Module 8 — Validation, Batch & Multi-Pass

<div class="ccaf-module-meta" markdown="0">
  <span class="ccaf-chip ccaf-chip--domain">D3.4 + D4.4 · Validation deep-dive</span>
  <span class="ccaf-chip">Weight: part of ~20%</span>
  <span class="ccaf-chip ccaf-chip--time">5–7 hr</span>
  <span class="ccaf-chip ccaf-chip--level">Applied</span>
</div>

## What you'll learn

- The validation-retry pattern in detail (with field-level error reconciliation)
- End-to-end Batches API workflow: submit, poll, retrieve, reconcile via `custom_id`
- Multi-pass review: local per-file + cross-file integration
- Why same-session self-review fails — the cognitive mechanism, not just the rule

This module ties together work from Modules 6 and 7. Treat it as the integration layer.

---

## 1. Validation-retry, in production

The core loop:

```
extract → validate → succeed | retry (with specific feedback)
```

What "validate" means in production goes well beyond schema:

| Layer | What it checks | Caught by |
|---|---|---|
| Schema | Required fields, types, enum values | `tool_use` itself |
| Format | ISO date format, regex match for IDs, length bounds | Validator function |
| Semantic | Business rules (amount > 0, date plausible, vendor non-empty) | Business rule validator |
| Cross-field | Total = sum of line items, end-date > start-date | Cross-field validator |
| External | Customer ID exists in DB, product code is active | External lookup |

The exam tests **schema vs semantic** distinction. Production work hits all five.

### Implementation pattern — separate validators per layer

```python
class ValidationError:
    def __init__(self, field: str, layer: str, detail: str):
        self.field, self.layer, self.detail = field, layer, detail

def validate_format(extracted: dict) -> list[ValidationError]:
    errors = []
    if not re.match(r"^INV-\d{6}$", extracted["invoice_number"]):
        errors.append(ValidationError(
            "invoice_number", "format",
            f"Expected pattern INV-NNNNNN. Got '{extracted['invoice_number']}'."
        ))
    return errors

def validate_semantic(extracted: dict) -> list[ValidationError]:
    errors = []
    if extracted["amount_usd"] <= 0:
        errors.append(ValidationError(
            "amount_usd", "semantic",
            f"Amount must be positive. Got {extracted['amount_usd']}."
        ))
    return errors

def validate_external(extracted: dict, db) -> list[ValidationError]:
    errors = []
    if not db.vendor_exists(extracted["vendor"]):
        errors.append(ValidationError(
            "vendor", "external",
            f"Vendor '{extracted['vendor']}' is not in the active vendor list."
        ))
    return errors
```

### What goes back to the model on retry

Concatenate the layer-tagged errors into a specific message:

```
The extraction had these issues:
- Field `invoice_number`: format — Expected pattern INV-NNNNNN. Got 'INVOICE-12345'.
- Field `amount_usd`: semantic — Amount must be positive. Got -50.00.

Please correct these and re-extract.
```

The model now knows exactly what to fix. Retry hit rate >90% for typical issues.

### Retry budget

Cap retries at 2–3. If the model can't fix in 3 attempts, escalate. Looping forever is a path to runaway cost.

---

## 2. Batches API — full workflow

### When you should use it

Recap from Module 6: 50% cost savings, 24-hour SLA. Use for non-urgent work that can wait.

### Step-by-step

**1. Build the request list with `custom_id` per request.**

```python
import anthropic
client = anthropic.Anthropic()

requests = [
    {
        "custom_id": f"audit-{file.path}",
        "params": {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 512,
            "messages": [
                {"role": "user", "content": f"Audit this file:\n{file.content}"}
            ],
        },
    }
    for file in files_to_audit
]
```

`custom_id` is the only thing tying responses back to your inputs. Make it deterministic and unique.

**2. Submit the batch.**

```python
batch = client.messages.batches.create(requests=requests)
print(f"Batch {batch.id} submitted with {len(requests)} requests")
```

**3. Poll for completion (or wait via webhook).**

```python
while True:
    status = client.messages.batches.retrieve(batch.id)
    if status.processing_status == "ended":
        break
    print(f"Status: {status.processing_status}")
    time.sleep(60)
```

**4. Retrieve and reconcile by `custom_id`.**

```python
results_by_id = {}
for result in client.messages.batches.results(batch.id):
    results_by_id[result.custom_id] = result.result

# Now match back
for file in files_to_audit:
    file.audit = results_by_id.get(f"audit-{file.path}")
```

**5. Handle individual failures.**

Each result has its own status. Some can succeed while others fail. Don't assume batch success means every request succeeded.

```python
for result in client.messages.batches.results(batch.id):
    if result.result.type == "succeeded":
        ...
    elif result.result.type == "errored":
        log.error(f"{result.custom_id} failed: {result.result.error}")
        # Decide: retry, escalate, or accept partial
```

### When NOT to use Batches

- Anything user-facing under 1 minute response time
- Blocking PR reviews (you need the result before merging, can't wait 24h)
- Real-time chat
- A/B test runs where you need next-decision feedback fast

---

## 3. Multi-pass review — local + cross-file

The single-pass alternative dilutes attention. Multi-pass keeps each pass focused.

### Pass 1 — local (per-file)

Each file gets its own focused review prompt:

```
You are reviewing exactly one file in isolation. The file is:

<file path="src/auth/login.ts">
...contents...
</file>

Review for: security issues, error handling gaps, missing validation.
Do NOT speculate about how this file is used elsewhere — focus only on
what's visible here.

Output JSON:
{ "findings": [ { "severity": "critical|high|medium|low", "issue": "...", "line": N } ] }
```

Each file gets a fresh review. No context bleeds between files. This catches issues localized to a single file.

### Pass 2 — cross-file integration

After collecting all per-file findings, run a cross-file pass:

```
You are reviewing how files in this PR interact. The per-file findings are:

<findings>
src/auth/login.ts: ...
src/auth/session.ts: ...
src/middleware/auth.ts: ...
</findings>

Identify integration issues:
- Contracts that changed in one file but not its callers
- Auth assumptions made in one file that don't hold in another
- Missing wiring (e.g. a new middleware never registered)

Output JSON.
```

This pass catches issues no single-file review could catch.

### Why this beats one mega-prompt

| | Single mega-prompt | Local + cross-file |
|---|---|---|
| Attention per file | Diluted across all files | Full attention per file |
| Cross-file issues | Buried in noise | Surfaced explicitly |
| Token efficiency | Re-sends every file in one call | Per-file pass is small; integration pass is small |
| Failure mode | Misses everything if context overflows | Per-file pass succeeds even if integration fails |

---

## 4. Why same-session self-review fails — the mechanism

You generated code in session A. You ask the same session to review it.

What the reviewer "sees" in its own context:

1. Your original request for the code
2. Its own reasoning while generating
3. The generated code

When asked to review, the model is now **explaining the very code it just wrote**. The reasoning that produced the code is the same reasoning evaluating the code. Confirmation bias is structurally baked in.

A separate session has only the artifact. It evaluates the code on its own merits. No "I made this choice because…" rationalizing.

### What this looks like in practice

Same-session: "The code looks good. The error handling is appropriate for the use case." (It's the same agent that decided what was appropriate.)

Separate-session: "Line 42 swallows exceptions silently. This is a high-severity bug because the caller has no way to know an operation failed." (Fresh eyes, no investment in the prior choice.)

> **Exam rule:** Same-session self-review = always wrong. Separate sessions = right. The mechanism is confirmation bias; the fix is fresh context.

---

## 5. Hands-on walkthrough

### Step 1 — multi-layer validator

Build the validator suite in section 1:

- [ ] Format validator (regex/length checks)
- [ ] Semantic validator (business rules)
- [ ] External validator (DB lookups, optional)
- [ ] Each validator returns `[ValidationError]` not just bool
- [ ] Errors include the layer tag

### Step 2 — retry loop with layer-tagged feedback

Plug your validators into the retry loop:

- [ ] Each retry message includes layer-tagged errors
- [ ] Retry budget capped at 3
- [ ] Test on 10 deliberately-bad inputs
- [ ] Measure: hit rate after retry should be >85%

### Step 3 — Batches API end-to-end

Audit 20+ files via Batches:

- [ ] Build request list with deterministic `custom_id` per file
- [ ] Submit batch, poll until ended
- [ ] Reconcile results by `custom_id`
- [ ] Handle at least one deliberately-failing request and confirm partial success works
- [ ] Compare cost vs running synchronously

### Step 4 — multi-pass review

On a small PR (≤10 files):

- [ ] Pass 1: per-file review (one call per file)
- [ ] Pass 2: cross-file integration review (one call combining the per-file findings)
- [ ] Compare to single mega-prompt: which surfaces more real issues?
- [ ] Compare token cost

### Step 5 — same-session vs separate-session review

Generate a deliberately-buggy function, then:

- [ ] **Same-session:** Ask the same conversation to review the function. Note what it says.
- [ ] **Separate-session:** Open a fresh session, paste only the function (no reasoning), ask to review.
- [ ] Compare. The separate session should catch the bug. The same session often won't.

---

## 6. Anti-patterns deep-dive

### Generic retry feedback

Already covered (Module 7 AP-15). Specific layer-tagged errors or no retry.

### Synchronous for non-urgent

Already covered (Module 6). Use Batches for nightly/weekly work.

### Same-session self-review

Already covered (Module 6 AP-12). The mechanism (confirmation bias) is what to remember for the exam — not just the rule.

### Single mega-prompt for code review

Multi-pass beats it. Always.

### Validating only schema

`tool_use` already enforces schema. Your validator's job is everything beyond schema. If your validator only re-checks schema, it isn't doing anything useful.

---

## 7. Best practices

- **Layer your validators.** Schema (free, from `tool_use`), format, semantic, cross-field, external. Each gets its own validator function.
- **Tag every validation error with its layer.** The retry message becomes self-documenting.
- **Cap retry attempts at 2–3.** Escalate beyond.
- **`custom_id` deterministic and unique.** No collisions, easy reconciliation.
- **Multi-pass review every PR over ~5 files.** Single-pass is fine for tiny PRs.
- **Never review in the same session that generated.** Fresh context per review.

---

## 8. Common pitfalls

- **Retry that re-sends the same prompt** without including the error — model produces the same wrong answer. The error inclusion is what makes retry work.
- **Submitting Batches with non-unique `custom_id`s** — reconciliation breaks.
- **Treating Batches "ended" as "succeeded"** — individual requests may still have failed. Always check per-request status.
- **Cross-file pass without per-file findings** — without focused per-file output to feed in, the cross-file pass has nothing concrete to integrate.

---

## 9. Verification

- [ ] Re-attempt the **Prompt Engineering** filter on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) — focus on validation / batch / multi-pass items
- [ ] Can you describe the validation layers (schema/format/semantic/cross-field/external)?
- [ ] Can you explain the same-session-review failure **mechanism** (not just the rule)?
- [ ] Can you write a Batches submission skeleton from memory?
- [ ] **Phase 2 retrospective:** still fuzzy on:
  > _your notes_

---

## 10. Further reading

- [Domain 3 source page](https://claudecertifications.com/claude-certified-architect/domains/claude-code-config) (Batches section)
- [Domain 4 source page](https://claudecertifications.com/claude-certified-architect/domains/prompt-engineering) (validation-retry section)
- [Anti-patterns AP-12, AP-15](../anti-patterns.md)

[Continue to Phase 3 — Module 9 :material-arrow-right:](09-context-management.md){ .md-button .md-button--primary }
