# Module 9 — Context Management

<div class="ccaf-module-meta" markdown="0">
  <span class="ccaf-chip ccaf-chip--domain">D5.1 + D5.2 · Context & Reliability</span>
  <span class="ccaf-chip">Weight: part of ~15%</span>
  <span class="ccaf-chip ccaf-chip--time">4–6 hr</span>
  <span class="ccaf-chip ccaf-chip--level">Mastery</span>
</div>

## What you'll learn

- Why progressive summarization destroys customer-support agents
- The "lost in the middle" effect and how to position critical data around it
- Case facts blocks — what they are, where they go, why they're immutable
- Valid vs invalid escalation triggers (recap from Module 3 with new framing)
- Access failure vs empty result — same rule, different domain

---

## 1. Progressive summarization is the silent killer

### What progressive summarization does

You have a long conversation. You ask the model to "summarize the conversation so far so we can fit more in context." The summary replaces the original messages.

Each round of this loses specifics:

```
Round 0 (full):
  Customer John Smith (ACC-12345), reporting that Order #98765 was
  charged $50.01 on 2026-04-12 instead of the expected $49.99.

Round 1 (summarized):
  Customer reported a billing discrepancy on a recent order.

Round 2 (summarized again):
  Customer had a billing issue.
```

By round 2, the agent has lost: the customer's name, account number, order number, exact amount, date. It's now operating on a generic "billing issue" — useless for taking specific action.

### Why this is exam-favorite material

The Domain 5 questions love showing this exact degradation pattern and asking "what should the agent do instead?" The answer is **always** case facts blocks (next section).

> **Exam rule:** Progressive summarization of critical customer details = wrong, every time. Case facts blocks = right.

---

## 2. The "lost in the middle" effect

The model attends most reliably to information at the **start** and **end** of a long context. Information in the middle gets recalled less reliably.

### What this means in practice

If you stuff critical information into a long prompt sandwich…

```
[System prompt]
[10,000 tokens of conversation history]
[Critical customer context: John Smith, ACC-12345, $50.01]   ← MIDDLE
[10,000 tokens more conversation history]
[User's latest message]
```

…the model may not reliably surface that critical context when answering. It saw it. It just didn't pay attention to it.

### The fix — position-aware ordering

Put critical, immutable info at the **start**. Put the latest message at the **end**. Middle gets the bulk content.

```
[System prompt]
[CASE FACTS BLOCK — immutable, critical, at start]   ← STRONG RECALL
[Conversation history]
[User's latest message]                              ← STRONG RECALL
```

---

## 3. Case facts blocks — the right answer to "how do I keep critical info?"

A **case facts block** is a structured, immutable section of context that holds the essential identifiers, amounts, and dates for the current case.

### What goes in it

- Customer identifier (name, account number)
- Transaction identifiers (order, invoice, ticket)
- Exact amounts, dates
- Policy decisions already made (refund pre-approved? escalation already attempted?)
- Anything specific that, if lost, would force the agent to ask the customer again

### What does NOT go in it

- Conversation prose ("the customer said…")
- Transient state ("currently looking up X")
- Speculative content ("might be related to Y")

The facts block is for **things you already know are true**, not for working memory.

### Example

```yaml
# Case facts (immutable)
case_id: SUP-2026-04-12-A91
customer:
  name: John Smith
  account: ACC-12345
  tier: premium
  joined: 2024-01-15
incident:
  order: '#98765'
  charged: $50.01
  expected: $49.99
  date: 2026-04-12
prior_actions:
  - refund_request_logged: 2026-04-13T09:32:00Z
  - first_response_sent: 2026-04-13T09:35:00Z
```

This block is at the **start** of every prompt the agent gets. It survives compaction, summarization, and forking. It's the source of truth.

### How to enforce immutability

Put it in a markdown fence or XML-tagged block. Instruct the agent: "Never modify the CASE FACTS block. If a fact is wrong, escalate; do not edit the block."

```
<case_facts>
... (the block) ...
</case_facts>

These are immutable. Do not summarize, modify, or omit them.
```

---

## 4. Trim verbose tool output, not facts

Long tool outputs (e.g. a 5,000-token database dump) consume context. Trim them — but trim the **noise**, not the **signal**.

### What to keep

- Identifiers and amounts
- Status codes and timestamps
- The specific row/record that prompted the call

### What to trim

- Schema metadata you didn't ask for
- Pagination boilerplate
- Repeated headers
- Unrelated rows that came back due to overly broad query

```python
# Raw tool output: 5,000 tokens
raw = db.search_orders(customer="ACC-12345")

# Trimmed: 500 tokens, only the order in question
trimmed = {
    "order": raw["orders"][0]["id"],
    "status": raw["orders"][0]["status"],
    "amount_charged": raw["orders"][0]["amount"],
    "expected_amount": raw["orders"][0]["expected_amount"],
    "date": raw["orders"][0]["date"],
}
```

The agent doesn't need the other 4,500 tokens. Cutting them frees attention for actual reasoning.

---

## 5. Escalation triggers — Domain 5 framing

Same rules as Module 3, framed for context-management questions.

### Valid triggers

1. **Explicit customer request** — "I want a person."
2. **Policy gap** — no rule covers it.
3. **Capability limit** — agent literally can't do it.
4. **Business threshold** — exceeded a configured limit.
5. **Repeated failure after recovery** — tried the recovery path twice, still failing.

### Invalid triggers (exam bait)

1. **Sentiment** — angry ≠ complex.
2. **Self-reported model confidence** — poorly calibrated.
3. **Generic error handling that loses context** — "something went wrong, escalating" with no info attached. Pass the structured error.

---

## 6. Access failure vs empty result — recurrent theme

Module 4 covered this for tool design. Module 9 frames it for context management:

When the agent reports something to the customer, it must distinguish:

- **"I checked, no matching account exists"** — empty result, normal outcome
- **"I couldn't check (database unreachable)"** — access failure, escalate

A lossy summarization that turns "I couldn't check" into "no account found" is worse than asking the customer to wait. Always preserve this distinction.

---

## 7. Hands-on walkthrough

### Step 1 — build a case-facts-anchored agent

Implement a customer support stub with:

- A `case_facts` block at the start of every prompt
- The block is constructed once at session start from the initial customer message + DB lookup
- The agent is instructed: "Never modify or summarize the case_facts block."

Pseudocode:

```python
case_facts = build_case_facts(customer_id, order_id)

def chat_turn(user_message, conversation_history):
    prompt = [
        {"role": "user", "content": (
            "<case_facts>\n" + yaml.dump(case_facts) + "\n</case_facts>\n\n"
            "These are immutable. Do not modify or summarize.\n\n"
            "Continue the conversation."
        )},
        *conversation_history,
        {"role": "user", "content": user_message},
    ]
    return client.messages.create(messages=prompt, ...)
```

- [ ] Run a 5-turn conversation
- [ ] After 5 turns, ask the agent: "What's the customer's account number?"
- [ ] Confirm it returns the exact number from the facts block

### Step 2 — break it on purpose

Replace the case_facts block with progressive summarization:

```python
# Wrong implementation
def summarize_history(history):
    return client.messages.create(
        messages=[{"role": "user", "content":
            f"Summarize this conversation: {history}"}],
        ...
    )

# Use the summary instead of the original
prompt = [{"role": "user", "content": summarize_history(conversation_history)}]
```

- [ ] Run the same 5-turn conversation
- [ ] After 5 turns, ask: "What's the customer's account number?"
- [ ] Note the answer is now generic / missing / wrong
- [ ] **Feel** why progressive summarization is wrong. This visceral demo is what makes the rule stick.

### Step 3 — position-aware ordering

Build a long-context prompt with critical info in three positions and measure recall:

- [ ] Test 1: critical info at start
- [ ] Test 2: critical info in middle
- [ ] Test 3: critical info at end
- [ ] Test prompt with each: "What was the customer's exact amount?"
- [ ] Test 1 and 3 should give correct answers most of the time. Test 2 is unreliable.

### Step 4 — trim a verbose tool output

Take a real DB query result. Write a trimmer that keeps only the fields needed:

- [ ] Original output token count
- [ ] Trimmed output token count
- [ ] Verify the trimmed version still has every fact needed for the next reasoning step
- [ ] Compare downstream reasoning quality between the two

### Step 5 — escalation logic

Implement the full escalation routing:

- [ ] Valid triggers map to `escalate(reason="explicit_request" | "policy_gap" | ...)`
- [ ] Invalid triggers (sentiment, confidence) are explicitly **not** escalation paths
- [ ] Test with 10 sample conversations covering both valid and invalid signals
- [ ] Verify: only the valid triggers escalate

---

## 8. Anti-patterns deep-dive

### AP-16 — Progressive summarization of critical details (Critical)

The Domain 5 flagship anti-pattern. **Always** wrong. Case facts blocks, every time.

### Compressing without preserving originals

A milder cousin of progressive summarization. You compress to save tokens, the originals get lost. If you must compress, keep originals available (e.g. via scratchpad file, Module 10).

### Disregarding lost-in-the-middle

Stuffing critical info wherever it happens to fit, ignoring that middle position degrades recall. Always position-aware.

### Sentiment-based escalation (recurrent)

Same as Module 3 AP-4. Worth memorizing twice.

### Generic error losing context

When an error happens, a generic "something went wrong" message loses what was actually attempted. Always pass structured error data through.

---

## 9. Best practices

- **Build a case facts block at session start.** Update it only by explicit policy (e.g. customer corrects a fact).
- **Position critical info at start or end** of context. Never middle.
- **Trim tool output aggressively** but never identifiers, amounts, dates, or status codes.
- **Forbid the agent from modifying the facts block.** Make this an explicit instruction.
- **Distinguish access failure from empty result** in every customer-facing message.

---

## 10. Common pitfalls

- **Building the facts block once and forgetting to update** when new authoritative facts come in (e.g. customer provides a correction). Have a controlled update path.
- **Letting the facts block grow unboundedly.** It's facts, not history. If it's growing, you're putting the wrong things in.
- **Summarizing tool output instead of trimming.** Summary is lossy. Trimming is just removing fields you don't need.

---

## 11. Verification

- [ ] Answer the **5 Context & Reliability questions** on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) (filter: Context & Reliability). Aim ≥ 4 / 5 right
- [ ] Can you draw a context layout diagram showing where case facts go?
- [ ] Can you list the valid + invalid escalation triggers from memory?
- [ ] Can you explain the lost-in-the-middle effect in one sentence?

---

## 12. Further reading

- [Domain 5 source page](https://claudecertifications.com/claude-certified-architect/domains/context-management)
- [Anti-pattern AP-16](../anti-patterns.md#ap-16-progressive-summarization-of-critical-customer-details)
- [Scenario 1 — Customer Support Resolution Agent](../scenarios.md#scenario-1-customer-support-resolution-agent)

[Continue to Module 10 — Advanced Context & Provenance :material-arrow-right:](10-context-provenance.md){ .md-button .md-button--primary }
