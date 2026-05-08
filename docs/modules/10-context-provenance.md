# Module 10 — Advanced Context & Provenance

<div class="ccaf-module-meta" markdown="0">
  <span class="ccaf-chip ccaf-chip--domain">D5.3 + D5.4 · Context & Reliability</span>
  <span class="ccaf-chip">Weight: part of ~15%</span>
  <span class="ccaf-chip ccaf-chip--time">4–6 hr</span>
  <span class="ccaf-chip ccaf-chip--level">Mastery</span>
</div>

## What you'll learn

- How context degrades in extended sessions and the four mitigation patterns
- Stratified metrics — why aggregate hides failure modes
- Provenance metadata: source, confidence, timestamp, agent
- Conflict resolution: link claims to sources, never silently pick

---

## 1. Context degradation in extended sessions

A session that runs for hours or days drifts. Symptoms:

- The model references "the file we were editing earlier" — but that file changed two hours ago
- Old decisions resurface as if still in force, even after being overridden
- Exploration debris (failed attempts, abandoned tangents) crowds the context
- Recall on early-session facts gets unreliable as the buffer fills

The fix is a layered set of mitigations.

### Mitigation 1 — `/compact`

`/compact` compresses the conversation history. Older turns get condensed into a summary, freeing space for new content.

**When to use:** session is getting long, recent turns are what matter, you don't need every word of the old turns.

**Caution:** compaction is lossy. Critical facts must live in the case facts block (Module 9), not in the conversation prose, or compaction will eat them.

### Mitigation 2 — Scratchpad files

Persist state outside the conversation in a markdown file the agent reads each turn:

```
.scratchpad.md
─────────────
## Active investigation
- Hypothesis: race condition in `processQueue()`
- Tested: ❌ added mutex (still fails under load)
- Tested: ✅ batched fewer items at once (works, slow)

## Open questions
- Is this acceptable perf for prod?
- Talk to @charlie about scaling concerns
```

The agent re-reads the scratchpad each turn (or you `@import` it). Survives compaction, survives session restarts. The scratchpad is **the** durable working memory.

### Mitigation 3 — Subagent delegation

When a subtask needs deep exploration (lots of file reads, lots of intermediate output), delegate to a subagent (Module 2). The subagent's exploration noise stays in its own context. Your coordinator gets back a clean synthesized result.

This is one of the strongest tools against coordinator context bloat.

### Mitigation 4 — Crash recovery manifests

For long-running agents that may need to resume after restart, persist a **manifest** describing:

- What's been completed
- What's in progress (and at what stage)
- What's queued
- The case facts block (so resumption has all critical data)

```yaml
# .agent-manifest.yml
case_id: SUP-2026-04-12-A91
case_facts: { ... }
completed:
  - lookup_customer
  - verify_charge
in_progress:
  step: process_refund
  attempt: 1
  state: awaiting_approval
queued:
  - send_resolution_email
```

On restart, the agent reads the manifest and resumes at `in_progress`.

---

## 2. Stratified metrics — why aggregate hides failure

You're running an extraction agent across many document types. You measure: 95% overall accuracy. Ship it.

Three months later: customers complain about invoice accuracy. You investigate.

```
                 Aggregate accuracy: 95%

Stratified:
  Receipts:    99% accuracy   (volume: 80% of inputs)
  Invoices:    70% accuracy   (volume: 15% of inputs)
  Contracts:   88% accuracy   (volume:  5% of inputs)
```

The aggregate hid that invoices — a load-bearing 15% — were failing 30% of the time. You shipped a system that was broken for an entire document category.

### The fix — stratify

Track accuracy **per category**:

| Document type | Accuracy | Sample size |
|---|---|---|
| Receipts | 99% | 8,000 |
| Invoices | 70% | 1,500 |
| Contracts | 88% | 500 |

Now the invoice failure is visible. You can target it (better few-shot examples? different schema? specialized subagent?).

### What to stratify by

- Document type
- Customer tier
- Geography / language
- Tool that was used
- Time period

Anything that could systematically affect outcomes.

> **Exam rule:** Aggregate-only metrics on stratified data = wrong. Per-category accuracy = right.

---

## 3. Provenance metadata — source, confidence, timestamp, agent

### Why provenance matters in multi-agent systems

Three subagents return claims about a customer:

- "Customer churned in March"
- "Customer is active premium tier"
- "Customer's last login was last week"

Without provenance, you have no way to know which to trust.

### The four required fields

| Field | What it captures | Example |
|---|---|---|
| `source` | Where the data came from | "billing_db", "support_tickets", "user_profile_api" |
| `confidence` | Reliability level | "verified", "extracted", "inferred", "estimated" |
| `timestamp` | When retrieved | "2026-04-12T09:32:00Z" |
| `agent` | Which subagent provided it | "billing_subagent", "support_subagent" |

### Tagging every claim

```json
{
  "claim": "Customer churned in March",
  "source": "billing_db",
  "confidence": "verified",
  "timestamp": "2026-04-12T09:32:00Z",
  "agent": "billing_subagent"
}
```

Now when claims conflict, you have the metadata to reason about which to trust:

- "verified" beats "inferred" for the same field
- More recent timestamp beats stale data when the field is mutable (status changes)
- Specific source (billing_db) beats general source (support_tickets) for billing facts

---

## 4. Conflict resolution — link claims to sources, never silently pick

### Wrong: silent picking

```
Status: active premium tier   ← coordinator picked one of three conflicting claims
```

The customer-facing answer doesn't show which source. Reviewers have no traceability.

### Wrong: averaging

```
Tenure: 3.2 years   ← averaged "3 years" and "3.5 years" claims
```

Averaging is meaningless for non-numeric fields and lossy for numeric ones. It's also a fabrication — neither original source said 3.2.

### Right: link each claim to its source

```
Status:
  - billing_db (verified, 2026-04-12T09:32Z): active premium tier
  - support_tickets (inferred, 2026-04-10T14:00Z): may have churned (ticket mentioned cancellation)
  → Recommended: trust billing_db (more recent, higher confidence, primary source).
    Flag for review: support ticket may be a separate event needing investigation.
```

Coordinator surfaces the conflict, recommends a resolution with rationale, and flags edge cases for human review.

### Stratified sampling for human review

When humans review agent output, they often sample. Random sampling can miss systematic failures (you happen to sample the cases that worked).

**Stratified sampling:** review N from each category, not N total at random. Same idea as stratified metrics: reveals failure modes that aggregate sampling hides.

---

## 5. Hands-on walkthrough

### Step 1 — extend Module 2's multi-agent demo with provenance

Take the multi-agent system from Module 2:

- [ ] Each subagent now tags every claim with `source`, `confidence`, `timestamp`, `agent`
- [ ] Coordinator stores all claims with metadata
- [ ] Coordinator shows provenance in its synthesis output

### Step 2 — inject a deliberate conflict

- [ ] Set up two subagents that will return conflicting claims for the same field
- [ ] Verify coordinator surfaces both claims with metadata
- [ ] Verify coordinator recommends a resolution with rationale (not silent pick)
- [ ] Verify the conflict is logged for human review

### Step 3 — stratified metrics

Add metrics tracking to your extraction work from Module 7:

- [ ] Track accuracy per document type, not just aggregate
- [ ] Use a deliberately imbalanced test set (e.g. 80% type A, 15% type B, 5% type C)
- [ ] Inject a systematic failure into type B
- [ ] Verify aggregate metric looks fine but stratified surfaces the type-B failure

### Step 4 — `/compact` workflow

- [ ] In a long Claude Code session, populate context with substantial history
- [ ] Run `/compact`
- [ ] Verify older turns are summarized, recent turns intact
- [ ] Try to recall a critical fact that was in the original (early) history — does it survive?
- [ ] Pre-load that fact into a case facts block before compaction; verify it survives

### Step 5 — scratchpad as durable working memory

- [ ] Configure a `.scratchpad.md` file the agent reads each turn (via `@import` in CLAUDE.md or explicit prompt instruction)
- [ ] Run a multi-session investigation, writing intermediate findings to scratchpad
- [ ] Restart Claude Code, resume — verify the agent picks up exactly where it left off via scratchpad

### Step 6 — crash recovery manifest

- [ ] Build a long-running agent that writes a manifest file each step
- [ ] Force-kill mid-execution
- [ ] Restart — verify the agent resumes at the right step using the manifest

---

## 6. Anti-patterns deep-dive

### AP-17 — Aggregate-only metrics (Critical)

Always wrong when input has natural categories. Stratify.

### AP-18 — No provenance for multi-agent data (High)

Always wrong in multi-agent systems. Track source, confidence, timestamp, agent.

### Silent conflict resolution

Picking one of conflicting claims without surfacing the conflict = wrong. Show all claims with metadata, recommend with rationale.

### Random sampling for review

Misses systematic failures. Stratified sampling instead.

### Compacting without preserving critical facts

If critical facts only live in conversation prose, compaction eats them. Move them to case facts block / scratchpad first.

---

## 7. Best practices

- **Tag every multi-agent claim** with the four-field provenance metadata.
- **Stratify metrics** by anything that could systematically vary.
- **Surface conflicts, never silently pick.** Recommend with rationale.
- **`/compact` for context bloat, scratchpad for durable state, subagents for exploration noise.**
- **Manifest for resumable long-running agents.** Cheap insurance.

---

## 8. Common pitfalls

- **Provenance fields populated lazily** — only on conflicts. Tag everything always; conflicts are detected by the metadata.
- **Stratifying after the fact** — define the strata before measuring, or you cherry-pick.
- **Manifest that's out of sync with actual state** — write it atomically per step, not at intervals.
- **Scratchpad that nobody reads** — must be `@import`-ed into the context or explicitly instructed each turn.

---

## 9. Verification

- [ ] Re-attempt the **Context & Reliability** filter on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) — focus on provenance / stratified-metrics / context-degradation items
- [ ] Can you list the four provenance fields?
- [ ] Can you state when stratification matters in one sentence?
- [ ] Can you list the four mitigations for context degradation?

---

## 10. Further reading

- [Domain 5 source page](https://claudecertifications.com/claude-certified-architect/domains/context-management)
- [Anti-patterns AP-17, AP-18](../anti-patterns.md#domain-5-context-reliability-3)
- [Scenario 3 — Multi-Agent Research System](../scenarios.md#scenario-3-multi-agent-research-system)

[Continue to Module 11 — Integration Exercises :material-arrow-right:](11-integration-exercises.md){ .md-button .md-button--primary }
