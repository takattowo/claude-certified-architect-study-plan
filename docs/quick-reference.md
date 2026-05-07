# Quick Reference

For last-minute review.

## "Always wrong on this exam" rules

When in doubt, eliminate any answer that does any of the following:

| # | Pattern that's always wrong | What to pick instead |
|---|---|---|
| 1 | Parses natural-language text for control flow | Check `stop_reason` |
| 2 | Uses iteration cap as primary stop | Let loop terminate via `stop_reason` |
| 3 | Uses prompt for critical business rule enforcement | Programmatic hooks (PreToolUse / PostToolUse) |
| 4 | Escalates based on sentiment or model confidence | Policy gaps, capability limits, explicit requests, business thresholds |
| 5 | Returns empty result on access failure | Distinguish access failure (`isError: true`) from empty result |
| 6 | Puts >5 tools on one agent | 4–5 tools per agent; distribute rest across subagents |
| 7 | Hardcodes API keys in `.mcp.json` | Use `${ENV_VAR}` expansion |
| 8 | Self-reviews in same session | Separate sessions for generator and reviewer |
| 9 | Uses interactive mode in CI | `-p` flag + `--output-format json` |
| 10 | Uses progressive summarization on critical case data | Immutable "case facts" block at start of context |
| 11 | Uses aggregate-only metrics on stratified data | Track per-document-type accuracy |
| 12 | Skips provenance in multi-agent | Track source, confidence, timestamp, agent ID |
| 13 | Uses vague "be thorough" criteria | Explicit measurable thresholds |
| 14 | Trusts `tool_use` for semantic correctness | Validate values separately |
| 15 | Uses generic retry messages | Append specific field-level error details |
| 16 | Uses Write for modifications, or Bash for file ops | Edit (modify), Read/Grep/Glob (file ops) |
| 17 | Forces rigid enums without `'other'` | Include `'other'` enum + detail field |
| 18 | Mixes personal prefs into project CLAUDE.md | User-level for personal; project for team standards |

---

## Five facts that never change

If you remember nothing else, remember these:

1. **Loops:** `stop_reason`. Always.
2. **Critical rules:** Hooks, not prompts.
3. **Tool budget:** 4–5 per agent. Hard cap.
4. **Secrets:** `${ENV_VAR}`. Never hardcode.
5. **Review:** Separate session. Always.

---

## Domain weights (study allocation)

| Domain | Weight |
|---|---|
| D1 Agentic Architecture | ~25% |
| D2 Tool Design & MCP | ~20% |
| D3 Claude Code Config | ~20% |
| D4 Prompt Engineering | ~20% |
| D5 Context Management | ~15% |

Heaviest weight: **D1 (~25%)** — prioritize this domain when allocating study time.

---

## Exam logistics

For authoritative, up-to-date logistics (registration, format, prerequisites, retake policy, accommodations) consult the official sources:

- **Exam guide:** [claudecertifications.com/claude-certified-architect/exam-guide](https://claudecertifications.com/claude-certified-architect/exam-guide)
- **FAQ:** [claudecertifications.com/claude-certified-architect/faq](https://claudecertifications.com/claude-certified-architect/faq)
- **Registration:** [Anthropic Skilljar portal](https://anthropic.skilljar.com)

Confirmed by the FAQ:

- Multiple choice, scenario-based — no coding during the exam
- 4 of 6 scenarios randomly selected per attempt
- 720 / 1000 passing score
- Currently free for the first 5,000 partner-company employees
- Source recommends ~12 weeks at ~1 hr/day

This site does not duplicate logistics info that may change. Check the source first.
