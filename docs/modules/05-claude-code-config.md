# Module 5 — Claude Code Configuration

<div class="ccaf-module-meta" markdown="0">
  <span class="ccaf-chip ccaf-chip--domain">D3.1 + D3.2 · Claude Code Config</span>
  <span class="ccaf-chip">Weight: part of ~20%</span>
  <span class="ccaf-chip ccaf-chip--time">4–6 hr</span>
  <span class="ccaf-chip ccaf-chip--level">Applied</span>
</div>

## What you'll learn

- The three-level CLAUDE.md hierarchy and its precedence rules
- `@import` syntax for modular configuration
- The difference between commands and skills — and when to use each
- SKILL.md frontmatter (`context: fork`, `allowed-tools`, `argument-hint`)

---

## 1. The CLAUDE.md hierarchy

Claude Code reads configuration from multiple scopes (from the [official memory docs](https://code.claude.com/docs/en/memory)):

| Scope | Path | Notes |
|---|---|---|
| **Managed policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `/etc/claude-code/CLAUDE.md` (Linux/WSL), `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | Org-enforced, cannot be overridden by user settings |
| **User** | `~/.claude/CLAUDE.md` | Personal, cross-project |
| **Project** | `./CLAUDE.md` **or** `./.claude/CLAUDE.md` | Team standards, version-controlled |
| **Local (gitignored)** | `./CLAUDE.local.md` | Per-project personal overrides |
| **Directory** | `CLAUDE.md` in any subdirectory | Module/feature-specific |

### How they combine — concatenation, not override

This is a common misconception. Files are **concatenated** into context, walking from filesystem root down to the current working directory. The doc states: *"More specific locations take precedence over broader ones,"* but stresses *"All discovered files are concatenated into context rather than overriding each other."*

Effective behavior:

- More-specific scopes (directory, then project) load **after** broader ones (user, then managed policy)
- Files later in the chain effectively "win" by recency — the model attends to the most recent instruction
- Within each directory, `CLAUDE.local.md` is appended after `CLAUDE.md`
- **All scopes are present in context simultaneously** — nothing is hidden

### What goes where

| Belongs at | Examples |
|---|---|
| **User** | Your output style, your tooling, "don't add emojis" |
| **Project** (`./CLAUDE.md`) | Code style, commit conventions, test requirements |
| **Local** (`./CLAUDE.local.md`) | Your personal notes for this project — **gitignored** |
| **Directory** | Module-specific overrides — "this folder uses 2-space indent", "legacy code, don't refactor" |

> **Exam rule (per claudecertifications.com source):** Personal preferences in project-level config = wrong. Team standards in user-level config = wrong. Match scope to audience. The source uses simplified "directory > project > user" precedence; the actual mechanism is concatenation with "more specific wins effectively." Both framings give the same right answer on exam questions.

### What goes where — the right answer is almost always "the most specific level"

| Belongs at | Examples |
|---|---|
| **User** | Your preferred output style, your favorite tooling, personal aliases, "don't add emojis" |
| **Project** | Code style, commit conventions, test requirements, architectural rules, "use TypeScript strict mode" |
| **Directory** | "This module is legacy, don't refactor", "this folder uses tabs not spaces", "all code here must be Python 3.8 compatible" |

> **Exam rule:** Personal preferences in project-level config = wrong. Team standards in user-level config = wrong. Match the scope to the audience.

---

## 2. `@import` syntax for modular configuration

A single 600-line CLAUDE.md is unmaintainable. Split it.

```markdown
# .claude/CLAUDE.md
@import .claude/rules/style.md
@import .claude/rules/testing.md
@import .claude/rules/security.md
```

Each imported file is a focused topic. Easier to review, easier to update, easier to share specific sections with PRs.

### `.claude/rules/` directory pattern

Conventional layout:

```
.claude/
├── CLAUDE.md              # entry point with @imports
├── rules/
│   ├── style.md
│   ├── testing.md
│   ├── security.md
│   └── architecture.md
├── commands/              # slash commands
└── skills/                # complex skills
```

### YAML frontmatter for path-specific scope

You can scope a rule file to specific paths using glob frontmatter:

```markdown
---
applies-to:
  - "src/api/**/*.ts"
  - "src/server/**/*.ts"
---

All API code must use the `Result<T, E>` type from `@/types/result`.
Errors must never throw across the API boundary.
```

This rule applies only to files matching the globs. Useful for module-specific conventions.

---

## 3. Commands vs skills

> **Important context:** per [the official skills docs](https://code.claude.com/docs/en/skills), custom commands have been **merged into skills** — `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`. If both exist with the same name, **the skill wins**. Skills are now the recommended form. The exam still tests both because the conceptual distinction (current-session vs forked-context) is what matters.

### Commands (`.claude/commands/`)

A slash command is a saved prompt. Type `/review`, get the same instructions every time.

- Run in **current session context** — they see your conversation
- Suit **quick, one-step actions** — "summarize this file", "lint this code"
- Defined as a markdown file with the prompt text

Example:

```markdown
<!-- .claude/commands/security-review.md -->
Review the changes in this PR for security issues. Focus on: SQL injection,
XSS, auth bypass, secrets in logs, unvalidated input. Return findings as a
numbered list with severity (critical/high/medium/low).
```

### Skills (`.claude/skills/<name>/SKILL.md`)

A skill is a reusable, multi-step capability with **isolated context**.

- Run in a **forked context** — the skill's own session, separate from yours
- Suit **complex, repeatable workflows** — "release the project", "audit dependencies"
- Defined with a `SKILL.md` file plus optional supporting files

Example:

```markdown
<!-- .claude/skills/release/SKILL.md -->
---
name: release
description: Cut a new release. Bumps version, updates changelog, tags, pushes.
context: fork
allowed-tools:
  - Read
  - Edit
  - Bash
argument-hint: <patch|minor|major>
---

You are the release skill. Steps:

1. Read package.json, determine current version.
2. Bump version per the argument.
3. Generate changelog entries from commits since last tag.
4. Update package.json + CHANGELOG.md.
5. Commit, tag, push.
```

### When to use which

| Use case | Pick |
|---|---|
| Quick single-step thing in your current session | **Command** |
| Multi-step workflow with its own state and tools | **Skill** |
| Should not pollute your main session's context | **Skill** (`context: fork`) |
| Should see what you've been working on | **Command** |
| Needs restricted toolset for safety | **Skill** with `allowed-tools` |

> **Exam rule:** Complex tasks needing context isolation = skill with `context: fork` + `allowed-tools`. Putting them in commands = wrong (pollutes session, no tool restriction).

---

## 4. SKILL.md frontmatter — three exam-relevant fields

### `context: fork`

Forks a fresh session for this skill. The main conversation continues unchanged after the skill finishes. Without `fork`, the skill runs in your current context and pollutes it with exploration noise.

### `allowed-tools`

Restricts which tools the skill can use. Critical for skills that:

- Touch production systems (limit to read-only)
- Should never execute Bash
- Operate on a specific file type (limit to Read/Edit, no Write)

```yaml
allowed-tools:
  - Read
  - Grep
  - Glob
```

A skill **without** `allowed-tools` can use everything — broad blast radius. Always set this.

### `argument-hint`

A hint shown when the user types the skill name. Lets you describe expected arguments:

```yaml
argument-hint: <patch|minor|major>
```

Now `/release ` shows the user what to type next.

---

## 5. Hands-on walkthrough

### Step 1 — set up the three-level hierarchy

In a test repo, create:

```
~/.claude/CLAUDE.md           # add: "Always use TypeScript strict mode"
my-repo/.claude/CLAUDE.md     # add: "Use 4-space indent for this project"
my-repo/legacy/CLAUDE.md      # add: "Use 2-space indent for legacy code"
```

- [ ] Open Claude Code in `my-repo/legacy/` — confirm it knows to use 2-space (directory beats project)
- [ ] Open Claude Code in `my-repo/` (not in legacy) — confirm 4-space (project beats user)
- [ ] Open Claude Code in some unrelated repo — confirm strict mode (user-level applies)

### Step 2 — split a monolithic CLAUDE.md

Take an existing 200+ line CLAUDE.md and split:

- [ ] Move style rules to `.claude/rules/style.md`
- [ ] Move testing rules to `.claude/rules/testing.md`
- [ ] Move security rules to `.claude/rules/security.md`
- [ ] Replace the original with `@import` lines
- [ ] Add path-scoped frontmatter to at least one rule file

### Step 3 — author a slash command

Create `.claude/commands/review.md`:

```markdown
Review the staged changes. Output:

1. Summary — 1-2 sentences.
2. Concerns — list any concerns (security, perf, correctness, style).
3. Suggested follow-ups.

Skip nitpicks. Focus on what would block a senior reviewer.
```

- [ ] Use `/review` in a session, observe the output
- [ ] Note the command sees your current conversation context

### Step 4 — author a skill

Create `.claude/skills/audit-deps/SKILL.md`:

```markdown
---
name: audit-deps
description: Audit project dependencies for known vulnerabilities and unused packages.
context: fork
allowed-tools:
  - Read
  - Bash
  - Grep
argument-hint: <optional package name to focus on>
---

You are the dependency audit skill.

1. Read package.json.
2. Run `npm audit --json` and parse vulnerabilities.
3. Use Grep to detect unused packages (no import statements).
4. Output a markdown report with: vulnerable packages, unused packages, recommendations.

Do NOT: install/upgrade packages, edit any file. Read-only audit.
```

- [ ] Run `/audit-deps`
- [ ] Confirm it runs in its own forked context (your main session unchanged after)
- [ ] Confirm it can't use Edit/Write (try to make it edit a file — should refuse)

---

## 6. Anti-patterns deep-dive

### AP-10 — Personal preferences in project CLAUDE.md (Medium)

You like 4-space indents. Your team uses tabs. You commit "use 4-space" to project CLAUDE.md.

**Why wrong:** Imposes your preference on the team. Causes inconsistency in the codebase the next time someone runs Claude Code without your config.

**Right:** Personal stuff goes in `~/.claude/CLAUDE.md`. Team-shared stuff goes in `.claude/CLAUDE.md`.

### AP-11 — Commands for tasks needing isolation (High)

You have a multi-step "audit" task that pulls in dozens of files and produces verbose intermediate output. You make it a command. Now every audit pollutes your main session with that noise.

**Why wrong:** Commands run in current session. The exploration debris stays.

**Right:** Skill with `context: fork`. Pollution stays in the forked session, your main thread is clean.

### One massive config file

A single 800-line CLAUDE.md is unmaintainable, hard to review, and risks contradictions.

**Right:** `@import` modular files in `.claude/rules/`.

### Skills without tool restrictions

A skill with no `allowed-tools` can do anything — including dangerous things you didn't intend. Always restrict.

---

## 7. Best practices

- **Match scope to audience.** User config for you. Project config for the team. Directory config for the module.
- **Modularize early.** As soon as your CLAUDE.md crosses 100 lines, split via `@import`.
- **Skill > command** when the task is multi-step or needs isolation.
- **Always set `allowed-tools` on skills.** No exceptions. Tighten the smallest sufficient set.
- **Add `argument-hint`** even for simple skills. UX win.

---

## 8. Common pitfalls

- **Editing the wrong CLAUDE.md** because of precedence confusion. When a rule "won't take effect", check the deeper levels.
- **Skills that depend on session state** because they were written assuming current-session context. Forked context means no shared state — pass needed info explicitly.
- **Hardcoded paths in CLAUDE.md** that break for other team members. Use relative paths or `@import`-style references.

---

## 9. Verification

- [ ] Answer the **5 Claude Code Config questions** on the [source practice bank](https://claudecertifications.com/claude-certified-architect/practice-questions) (filter: Claude Code Config). Aim ≥ 4 / 5 right — focus on hierarchy / commands-vs-skills items
- [ ] Can you write out the precedence order from memory?
- [ ] Can you list all three SKILL.md frontmatter fields and what each does?
- [ ] Can you state the one-sentence "command vs skill" decision rule?

---

## 10. Further reading

- [Domain 3 source page](https://claudecertifications.com/claude-certified-architect/domains/claude-code-config)
- [Anti-patterns AP-10, AP-11](../anti-patterns.md#domain-3-claude-code-configuration-3)
- [Scenario 2 — Code Generation with Claude Code](../scenarios.md#scenario-2-code-generation-with-claude-code)

[Continue to Module 6 — Plan Mode, Iteration & CI/CD :material-arrow-right:](06-plan-mode-cicd.md){ .md-button .md-button--primary }
