# Module 7 — Prompt Engineering & Structured Output

<div class="ccaf-module-meta" markdown>
**Domain:** D4 (full) · **Weight:** ~20% · **Time budget:** 5–7 hr
</div>

## What you'll learn

- Why explicit measurable criteria beats vague instructions
- The 2–4 example sweet spot for few-shot prompting
- `tool_use` for guaranteed structured output — and the trap people fall into
- Validation-retry loops with **specific** error feedback

---

## 1. Explicit measurable criteria > vague instructions

### The "be thorough" trap

Engineers love writing prompts like:

> "Be thorough. Flag anything suspicious."

This produces alert fatigue. The model flags everything: stylistic preferences, edge cases that don't matter, harmless patterns. Reviewers learn to ignore the bot. Real issues get drowned.

### What explicit looks like

Replace "be thorough" with measurable criteria:

> Flag a function as a security concern if **any** of:
>
> - It accepts user input AND constructs a database query without parameterization
> - It returns server-rendered HTML that includes any field marked `userProvided: true`
> - It calls dangerous dynamic-eval primitives (e.g. `eval`, `Function`) with non-literal arguments
> - It logs an object whose schema includes fields named `password`, `token`, `secret`, or `apiKey`
>
> Otherwise, skip it. Do not flag style, perf, or maintainability.

Now the bot flags fewer things, with higher signal. Reviewers trust the bot. Real issues land.

### The pattern

For every "be X" instruction, ask: *what observable thing would let me check whether the model did X?* If you can't answer, the instruction isn't actionable.

> **Exam rule:** "Be thorough" / "use good judgment" / "be careful" — wrong. Explicit measurable criteria — right.

---

## 2. Few-shot prompting — the 2–4 sweet spot

Few-shot = giving the model examples of input → output. Powerful for tasks with fuzzy boundaries.

### How many examples?

| Count | Effect |
|---|---|
| 0 | Zero-shot. Model guesses based on description alone. Works for clear tasks. |
| 1 | Often misleading — the model might pattern-match the single example too literally. |
| **2–4** | **Sweet spot.** Establishes format, demonstrates reasoning, covers edge variation. |
| 5–6 | Diminishing returns. |
| 7+ | Bloats the prompt without proportional benefit. |

### Format consistency is required

All examples must follow the same format. Inconsistency confuses the model:

❌ Inconsistent (will hurt accuracy):

```
Example 1:
Input: "Refund $50 for order 123"
Output: { "intent": "refund", "amount": 50 }

Example 2:
Input: "Process refund of fifty dollars on order #123"
Output: refund | 50 | 123
```

✅ Consistent:

```
Example 1:
Input: "Refund $50 for order 123"
Output: { "intent": "refund", "amount_usd": 50, "order_id": "123" }

Example 2:
Input: "Process refund of fifty dollars on order #123"
Output: { "intent": "refund", "amount_usd": 50, "order_id": "123" }
```

### Include one ambiguous edge case

Don't give 4 easy examples. Include at least one that's genuinely ambiguous, so the model sees how you want fuzzy cases handled.

> **Exam rule:** 2–4 examples optimal. >6 = bloat without benefit. 0 examples for ambiguous tasks = under-spec.

---

## 3. `tool_use` for guaranteed structured output

### What it guarantees

When you force `tool_use` with a specific tool and a JSON schema, the model **must** return JSON matching that schema. No prose, no markdown fences, no "here's your output:" prefix. The model uses the schema as a contract.

### What it does NOT guarantee

The **values** inside the JSON. The schema enforces structure (correct fields, correct types, enums respected). It does not enforce that the values are correct.

| | Schema-enforced? |
|---|---|
| All required fields present | Yes |
| Types match | Yes |
| Enums respect allowed values | Yes |
| Values are *correct* (right amount, right product, right reason) | **No** |

### The exam trap

Distractor: "Using `tool_use` ensures the extracted data is correct."

This is wrong. `tool_use` ensures the extracted data is **structured**. Correctness needs separate validation (next section).

> **Exam rule:** `tool_use` = structure only, not semantics. Always validate values after.

### How to use it

```python
TOOL = {
    "name": "extract_invoice",
    "description": "Extract invoice fields from text.",
    "input_schema": {
        "type": "object",
        "properties": {
            "invoice_number": {"type": "string"},
            "amount_usd": {"type": "number"},
            "vendor": {"type": "string"},
            "date": {"type": "string", "format": "date"},
            "currency": {
                "type": "string",
                "enum": ["USD", "EUR", "GBP", "JPY", "other"]
            }
        },
        "required": ["invoice_number", "amount_usd", "vendor", "date", "currency"],
    },
}

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=[TOOL],
    tool_choice={"type": "tool", "name": "extract_invoice"},  # forced
    messages=[{"role": "user", "content": invoice_text}],
)

extracted = response.content[0].input
```

### Schema design — three rules

1. **Mark required fields explicitly.** The model is allowed to omit non-required fields; that's a defection, not a bug.
2. **Enums with `'other'` for ambiguity.** A rigid enum forces misclassification when the input doesn't fit. Always include `'other'`, plus a free-text `*_detail` field for the value the model would have wanted.
3. **Nullable fields where data may be missing.** `{ "type": ["string", "null"] }` is more honest than forcing the model to invent something.

### `tool_choice` — three modes

| Value | Behavior |
|---|---|
| `'auto'` | Model decides if any tool is needed |
| `'any'` | Model **must** use a tool, but picks which |
| `{"type": "tool", "name": "X"}` | Model **must** use tool X |

For structured extraction, force the specific tool. Don't leave it to chance.

---

## 4. Validation-retry loops

### The loop pattern

```
1. Send prompt + schema. Get extracted JSON.
2. Validate against business rules (not just schema).
3. If valid: done.
4. If invalid: retry, including SPECIFIC error feedback.
```

### Specific error feedback is the load-bearing part

Generic retry doesn't help:

❌ "There were errors. Please try again."

The model has no idea what to fix. It often produces the same wrong answer.

✅ "Field `amount_usd` was 50.005 but the schema requires a number with at most 2 decimal places. The currency was 'XYZ' but the enum only allows USD, EUR, GBP, JPY, or other. Please correct these and re-extract."

Now the model has actionable signal. Retry hit rate climbs from <30% to >90%.

### Implementation skeleton

```python
def extract_with_retry(text, max_retries=3):
    messages = [{"role": "user", "content": text}]
    for attempt in range(max_retries):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            tools=[TOOL],
            tool_choice={"type": "tool", "name": "extract_invoice"},
            messages=messages,
            max_tokens=1024,
        )
        extracted = response.content[0].input
        errors = validate_business_rules(extracted)
        if not errors:
            return extracted

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": (
            "The extraction had these issues:\n"
            + "\n".join(f"- Field `{e.field}`: {e.detail}" for e in errors)
            + "\nPlease correct and re-extract."
        )})
    raise ExtractionFailed(errors)
```

### Multi-pass review

For tasks too large for one pass:

1. **Local pass** — per-file analysis. Each file gets its own focused prompt.
2. **Cross-file integration pass** — synthesize across files. Catches issues that need wider context (e.g. "this function's contract changed; calls in other files weren't updated").

A single mega-prompt covering everything dilutes attention. Two passes outperform one.

> **Exam rule:** Generic retry = wrong. Specific field-level feedback = right. Multi-pass beats single mega-pass for code review.

---

## 5. Hands-on walkthrough

### Step 1 — explicit-criteria security review

Pick a file in your codebase. Write two security-review prompts:

- [ ] **Vague version:** "Review this for security issues."
- [ ] **Explicit version:** Specific, measurable criteria (use the example in section 1 as template)
- [ ] Run both. Count: how many of the explicit version's flags are real issues vs the vague version's flags?

### Step 2 — few-shot extraction

Pick a parsing task: extract product names + prices from product description text.

- [ ] Write a 0-shot version
- [ ] Write a 2-shot version (consistent format)
- [ ] Write a 6-shot version
- [ ] Run all three on a 20-item test set. Score accuracy. Note where 2-shot wins or matches 6-shot at lower token cost.

### Step 3 — `tool_use` extraction with forced choice

Build the invoice extractor in section 3:

- [ ] Define the tool schema with an `'other'` enum value
- [ ] Force `tool_choice` to that specific tool
- [ ] Extract from 5 sample invoices
- [ ] Confirm structure is always correct
- [ ] Find at least one case where structure is correct but a value is wrong (semantic error) — proves the point about validating semantics separately

### Step 4 — validation-retry loop

Add validation to your extractor:

- [ ] Business rule: `amount_usd` must be > 0 and < 1,000,000
- [ ] Business rule: `date` must be within the last 5 years
- [ ] Business rule: `vendor` must not be empty
- [ ] Implement specific-feedback retry (max 3 attempts)
- [ ] Test on bad inputs: confirm specific feedback appears in retry; confirm the retry hit rate is high (>80%)

### Step 5 — multi-pass review

Take a small repo and review:

- [ ] **Pass 1:** Per-file. For each file, prompt: "Review this file in isolation."
- [ ] **Pass 2:** Cross-file. Prompt: "Given these per-file findings, identify integration issues."
- [ ] Compare against a single mega-prompt that included all files at once
- [ ] Note which approach surfaces more real issues

---

## 6. Anti-patterns deep-dive

### AP-13 — Vague "be thorough" (Critical)

Always wrong. Explicit measurable criteria, every time.

### AP-14 — Assuming `tool_use` ⇒ semantic correctness (High)

The favorite Domain 4 trap. `tool_use` enforces shape, not values. **Always** validate semantics separately.

### AP-15 — Generic retry messages (High)

"Try again" is no signal. Field-level specifics or no retry.

### Rigid enums

A schema with `enum: ["A", "B", "C"]` forces misclassification when the input is "D". Always include `'other'` + a detail field.

### Inconsistent few-shot examples

Format must be consistent across examples or the model gets confused.

### Single mega-prompt for code review

Dilutes attention. Multi-pass (local + integration) wins.

---

## 7. Best practices

- **Every "be X" instruction needs a measurable criterion.** If you can't write the check, the instruction isn't useful.
- **2–4 few-shot examples, format-consistent, including one ambiguous case.**
- **Force `tool_choice` for structured extraction.** Don't leave it to chance.
- **Always include `'other'` + detail field in classification enums.**
- **Validate semantics after `tool_use`.** The schema is a contract for shape only.
- **Specific field-level feedback in retry.** Generic = no signal.
- **Multi-pass review** (per-file + cross-file) over single mega-prompt.

---

## 8. Common pitfalls

- **Forgetting `tool_choice`** — without it, the model may decide not to use the tool at all.
- **Including non-JSON in the prompt right before requesting JSON** — confuses the model. Keep examples and schema-relevant content right before the request.
- **Asking for "natural language explanation **AND** JSON output"** — pick one. If you need both, two separate calls.
- **Validation that only checks schema** — the schema is already enforced. Add the business rules.

---

## 9. Verification

- [ ] Answer the **5 Prompt Engineering questions** on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) (filter: Prompt Engineering). Aim ≥ 4 / 5 right
- [ ] Can you state the few-shot count rule from memory?
- [ ] Can you explain the `tool_use` trap in one sentence?
- [ ] Can you write a specific-feedback retry message template?

---

## 10. Further reading

- [Domain 4 source page](https://claudecertifications.com/claude-certified-architect/domains/prompt-engineering)
- [Anti-patterns AP-13, AP-14, AP-15](../anti-patterns.md#domain-4-prompt-engineering-3)
- [Scenario 6 — Structured Data Extraction](../scenarios.md#scenario-6-structured-data-extraction)

[Continue to Module 8 — Validation, Batch & Multi-Pass :material-arrow-right:](08-validation-batch-multipass.md){ .md-button .md-button--primary }
