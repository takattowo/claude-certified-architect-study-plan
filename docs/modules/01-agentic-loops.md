# Module 1 — Agentic Loops & Core API

<div class="ccaf-module-meta" markdown>
**Domain:** D1.1 (Agentic Architecture) · **Weight on exam:** part of ~25% · **Time budget:** 4–6 hr
</div>

## What you'll learn

By the end of this module you will be able to:

- Describe the five-step agentic loop in your own words without referring to docs
- Read a `stop_reason` value and predict whether the next iteration will run
- Recognize anti-patterns that look reasonable but break in production
- Implement a minimal agent loop in Python from scratch (no SDK abstractions)

This is the foundation. Every other domain assumes you have these mechanics internalized.

**Source:** [Domain 1 — Agentic Architecture](https://claudecertifications.com/claude-certified-architect/domains/agentic-architecture)

---

## 1. The Agentic Loop — five steps, no exceptions

An "agentic loop" is the conversation pattern where the model gets to call tools, see the results, and decide what to do next — continuing until it's done.

The five steps:

1. **Send** — your code sends a message + the list of available tools to Claude.
2. **Respond** — Claude returns either text (for the user) or a `tool_use` block (a request to run a tool).
3. **Execute** — your code runs the tool with the arguments Claude supplied.
4. **Append** — your code appends the tool result as a `tool_result` block to the conversation history.
5. **Repeat** — your code sends the updated conversation back to Claude. Repeat until Claude says it's done.

The "done" signal is **`stop_reason: "end_turn"`**. Every other step in the loop is bounded by what `stop_reason` you got back.

### Why this matters

The model decides when it's done. Your code only **observes** that decision via `stop_reason`. Anything else you do — counting iterations, parsing text for "all done", stopping when output exceeds N tokens — is a guess at what the model meant. Guesses fail when the model phrases things differently across runs.

---

## 2. `stop_reason` — the only field that matters for control flow

Every Claude response has a `stop_reason`. The exam-relevant values:

| Value | Meaning | What your loop does |
|---|---|---|
| `"tool_use"` | Claude asked to run a tool | Execute the tool, append the result, send back. **Continue loop.** |
| `"end_turn"` | Claude is done with this turn | **Exit loop.** Return the final text to the user. |
| `"max_tokens"` | Hit output token limit mid-response | Either retry with more tokens, or treat as failure. Don't pretend it's complete. |
| `"stop_sequence"` | Hit a configured stop string | Treat per your policy. |

> **Exam rule:** Whenever a question asks "how should the agent decide whether to continue?", the right answer always involves checking `stop_reason`. If an answer choice involves checking text content, counting iterations, or watching token counts as the **primary** signal, it's wrong.

---

## 3. Hands-on walkthrough — minimal loop in Python

Build this yourself. Don't use the Agent SDK. The point is to feel the mechanics.

### Setup

```bash
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...
```

### Step 1 — define a single tool

```python
# loop.py
import json
from anthropic import Anthropic

client = Anthropic()

TOOLS = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a city. Returns Celsius.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g. 'Hanoi'"}
            },
            "required": ["city"],
        },
    }
]

def run_tool(name: str, args: dict) -> str:
    if name == "get_weather":
        # Pretend to call a real API
        return json.dumps({"city": args["city"], "temp_c": 28, "condition": "humid"})
    return json.dumps({"error": f"unknown tool: {name}"})
```

**Expected outcome:** A tool definition the model can read. Note the **detailed** description and explicit input schema — these matter for tool selection accuracy (Module 4 covers why).

### Step 2 — run the loop, log `stop_reason` every turn

```python
def chat(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]
    turn = 0

    while True:
        turn += 1
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
        )
        print(f"[turn {turn}] stop_reason={response.stop_reason}")

        # Append assistant's full response to history
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            # Extract final text and return
            text_blocks = [b.text for b in response.content if b.type == "text"]
            return "\n".join(text_blocks)

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = run_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        # Anything else — be loud, don't pretend it succeeded
        raise RuntimeError(f"Unexpected stop_reason: {response.stop_reason}")


if __name__ == "__main__":
    print(chat("What's the weather in Hanoi today? Be brief."))
```

**Expected outcome (your console):**

```
[turn 1] stop_reason=tool_use
[turn 2] stop_reason=end_turn
The weather in Hanoi is 28°C and humid.
```

### Step 3 — verify the failure modes

Edit your code to artificially break the loop and feel the difference:

- [ ] **Try parsing text instead of `stop_reason`.** Replace the `stop_reason == "end_turn"` check with `if "weather" in extracted_text: break`. Run a few times. Notice how the model phrases "weather" inconsistently — sometimes "the conditions", sometimes "today's report". The text check fails non-deterministically. **This is exactly why the exam hammers `stop_reason`.**
- [ ] **Try an iteration cap as the primary stop.** Set a hard `max_turns = 2` and remove the `stop_reason` checks. Watch what happens with a multi-tool query: it terminates mid-task with no synthesis. Now realize iteration caps belong as a **safety net**, not the primary stopping mechanism.

### Hands-on checklist

- [ ] Implemented the minimal loop
- [ ] Logged `stop_reason` for every turn
- [ ] Forced a `tool_use` cycle, then `end_turn`, and verified the loop exits cleanly
- [ ] Reproduced the text-parsing failure mode at least once
- [ ] Reproduced the iteration-cap failure mode at least once

---

## 4. Anti-patterns deep-dive

### AP-1 — Parsing natural language for loop termination (Critical)

**What it looks like in code:**

```python
# WRONG
if "all done" in response.content[0].text.lower():
    break
```

**Why people do it:** Feels intuitive. The model says "all done", so checking for that string seems fine.

**Why it's wrong:** The model isn't constrained to phrase completion the same way twice. Across 1000 production calls you'll see "I've completed your request", "Here are the results:", "That should do it!", and ten others. Some won't contain the string at all if the answer is short ("28°C, humid"). Your loop either spins forever or exits early.

**Right approach:** `if response.stop_reason == "end_turn": break`. Structured, deterministic, model-version-stable.

### AP-2 — Iteration caps as the primary stop (Critical)

**What it looks like:**

```python
# WRONG
for _ in range(5):
    response = client.messages.create(...)
    if response.content:
        break
```

**Why people do it:** Defensive programming reflex. "What if it loops forever?"

**Why it's wrong:** Tasks legitimately need different turn counts. A simple lookup might take 2 turns; a research synthesis might take 8. A fixed cap either cuts off mid-task or wastes turns on completed work.

**Right approach:** Loop on `stop_reason`. Add an iteration cap **as a safety net** (e.g., `max_turns = 50`) that signals a bug if hit, not as the routine exit condition.

```python
# RIGHT
MAX_SAFETY_TURNS = 50
for turn in range(MAX_SAFETY_TURNS):
    response = ...
    if response.stop_reason == "end_turn":
        return response
if turn == MAX_SAFETY_TURNS - 1:
    log.error("Hit safety cap — agent may be stuck. Investigate.")
    raise AgentLoopExceeded(...)
```

---

## 5. Best practices

- **Always log `stop_reason` per turn** in dev. It's the cheapest debugging signal you'll ever add.
- **Append the assistant's full `content` array** to history, not a string. The model needs the raw `tool_use` blocks for the next turn to make sense.
- **Treat `max_tokens` as a partial result, not a completion.** Either retry with more tokens or surface the truncation to the caller.
- **Wrap tool execution in its own try/except.** Tool errors should produce a structured `tool_result` with an error flag (Module 4 covers this), not crash the loop.

---

## 6. Common pitfalls

- **Forgetting `tool_use_id`** when appending `tool_result` — Claude needs it to match the result to the request. Always echo it back.
- **Sending tool results as a `user` message in the wrong format** — must be `{"type": "tool_result", "tool_use_id": ..., "content": ...}` inside a content array.
- **Filtering out `tool_use` blocks before appending the assistant message** — this breaks the next turn because Claude no longer sees its own tool calls.

---

## 7. Verification

- [ ] Practice Test 1 (10 questions on the source site) — score: ___ / 10
- [ ] Can you state, in one sentence each, what `tool_use` and `end_turn` mean?
- [ ] Can you draw the five-step loop on a whiteboard from memory?

If you scored < 8/10 on Practice Test 1, redo Step 3 (verify failure modes) — feeling the failures is what makes the rule stick.

---

## 8. Further reading

- [Domain 1 source page](https://claudecertifications.com/claude-certified-architect/domains/agentic-architecture)
- [Anthropic — Tool use overview](https://docs.anthropic.com/claude/docs/tool-use)
- [Anti-pattern AP-1](../anti-patterns.md#ap-1-parsing-natural-language-for-loop-termination)
- [Anti-pattern AP-2](../anti-patterns.md#ap-2-arbitrary-iteration-caps-as-primary-stopping-mechanism)

[Continue to Module 2 — Multi-Agent Orchestration :material-arrow-right:](02-multi-agent.md){ .md-button .md-button--primary }
