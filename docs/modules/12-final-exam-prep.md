# Module 12 — Final Exam Prep

<div class="ccaf-module-meta" markdown>
**Time budget:** 6–10 hr · **Goal:** target weak spots, run timed exams, ship readiness
</div>

## What this module does

You've covered all the material. This module is about **closing gaps and proving readiness**.

1. Targeted review of your weakest domains (from Module 11's diagnostic)
2. Re-do the anti-pattern cheatsheet from memory
3. Three timed full-length practice exams
4. Logistics: registration, scheduling, day-of routine

---

## 1. Targeted review

From Module 11 you identified your two weakest domains. For each:

### Weakest domain 1: ____________

- [ ] Re-read the source domain page on claudecertifications.com
- [ ] Re-read the corresponding module(s) on this site
- [ ] Re-do any failed practice questions
- [ ] Write a one-page "rules I keep forgetting" cheatsheet for this domain
- [ ] Test yourself: explain each anti-pattern in this domain to a rubber duck

### Weakest domain 2: ____________

- [ ] Same routine as above

### Common weak spots and what to drill

Check which of these resonate. If yes, drill them.

| Weak spot | Drill |
|---|---|
| Stop reason values | Module 1 hands-on, build the loop again |
| Hub-and-spoke vs flat | Module 2 hands-on, force parallel dispatch |
| Hooks vs prompts decision | Module 3 hands-on, write 3 different hooks |
| Tool description quality | Module 4, write 5 tool descriptions, peer-review with the rubric |
| Structured error fields | Module 4, memorize the 4-field shape |
| CLAUDE.md precedence | Module 5, draw the hierarchy on paper |
| Plan mode triggers | Module 6, list 5 examples each side |
| `tool_use` semantic trap | Module 7, find a case where structure is correct but value wrong |
| Batches workflow | Module 8, run an end-to-end batch |
| Case facts vs progressive summarization | Module 9, the visceral demo |
| Stratified metrics | Module 10, build a deliberately imbalanced test |

---

## 2. Anti-pattern recall — from memory

Get a blank sheet of paper (or empty markdown file). Without looking, write down:

- All 18 anti-patterns
- For each: the wrong pattern, the right pattern, the criticality
- Group them by domain

Then compare to the [Anti-Patterns Cheatsheet](../anti-patterns.md). Score yourself:

- 18/18: ready
- 15–17: identify the gaps, drill those specifically
- <15: need another pass through the modules covering the missed ones

This is the highest-leverage hour you can spend before exam day. Most exam questions map to one of these 18.

---

## 3. Timed practice exams

Three full-length practice exams, taken in real exam conditions:

### Practice Exam 2 (timed)

- [ ] Set a timer matching the exam duration (check official exam length)
- [ ] No notes, no docs, no internet
- [ ] Answer every question
- [ ] Score: ___ / 50

### Practice Exam 3 (timed)

- [ ] Same conditions
- [ ] Score: ___ / 50

### Final Practice Exam (timed)

- [ ] Same conditions
- [ ] Score: ___ / 50

### Readiness criteria

You're ready when:

- All three timed exams ≥ 80%
- No domain consistently below 75%
- You can recall all 18 anti-patterns from memory
- You can describe all 6 scenarios' decision points

If any criterion fails, do another pass on the weakest area before scheduling.

---

## 4. Logistics

### Registration

- [ ] Visit the [Anthropic Skilljar portal](https://anthropic.skilljar.com)
- [ ] Confirm partner-employee free seat eligibility (5,000 employee cap)
- [ ] Register for the Claude Certified Architect — Foundations exam
- [ ] Schedule date: ___________

### Day-before checklist

- [ ] Review the [Quick Reference](../quick-reference.md) page once
- [ ] Re-do anti-pattern recall from memory (should be solid by now)
- [ ] Sleep early. The exam is more about pattern recognition than fresh problem-solving.

### Day-of checklist

- [ ] Government-issued photo ID handy (if required)
- [ ] Stable internet connection
- [ ] Quiet room, no distractions
- [ ] Other apps closed
- [ ] Water nearby
- [ ] Logged into Skilljar before scheduled start
- [ ] Took 3 deep breaths

### During the exam

- **Read every option before answering.** Distractors often look right at first glance.
- **Eliminate the "always wrong" patterns first.** Sentiment-based escalation, hardcoded keys, same-session review, parsing text for control flow, generic errors — see them, eliminate them.
- **Time-budget per question.** Don't spend 10 minutes on one. Mark and return.
- **Trust the rules you've memorized.** Don't second-guess on test day.

---

## 5. Five rules to remember if you remember nothing else

If exam-day nerves wipe out the details, these five will carry you most of the way:

1. **Loops:** check `stop_reason`. Always.
2. **Critical rules:** hooks, not prompts.
3. **Tools per agent:** 4–5. Hard cap.
4. **Secrets in `.mcp.json`:** `${ENV_VAR}`. Never hardcode.
5. **Code review:** separate session. Always.

These five eliminate >50% of distractors on the exam.

---

## 6. After the exam

### If you passed

- [ ] Update your LinkedIn / résumé
- [ ] Share what worked: open a PR or issue on this repo with your tips
- [ ] Help the next person preparing — answer their questions

### If you didn't pass

- [ ] Don't dwell. The cert allows retakes.
- [ ] Identify which scenarios tripped you up (post-exam reflection while it's fresh)
- [ ] Re-target those modules
- [ ] Schedule retake when timed practice exams stabilize at 85%+

---

## 7. Final readiness gate

Do not schedule the exam until **all** boxes below are checked.

- [ ] All 12 modules complete
- [ ] All 18 anti-patterns recallable from memory
- [ ] All 6 scenarios: every decision + anti-pattern recallable
- [ ] Practice Tests 1–10: each ≥ 80%
- [ ] Full Practice Exams 2 + 3 + Final: each ≥ 80% (target ≥ 85% for safety vs 720/1000 cutoff)
- [ ] Hands-on exercises A–D from Module 11 shipped
- [ ] One full sleep before exam day

When every box is checked: schedule. You're ready.

---

[Back to Study Plan Overview :material-arrow-right:](../study-plan.md){ .md-button .md-button--primary }
[Quick Reference :material-arrow-right:](../quick-reference.md){ .md-button }
