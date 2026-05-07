# Contributing

Thanks for considering a contribution! This is a community study resource — every fix, clarification, or new exercise helps the next person preparing for the exam.

## Ways to contribute

- **Typos and clarifications** — open a PR directly. Small fixes don't need an issue first.
- **Add hands-on exercises** — if you built something while studying, share it. Even a code snippet helps.
- **Translate** — non-English versions welcome. Open an issue first to coordinate.
- **Link community resources** — blog posts, video walkthroughs, study notes. Add to the relevant page.
- **Update from source** — if [claudecertifications.com](https://claudecertifications.com/claude-certified-architect) updates, sync the relevant content here.

## How to set up locally

```bash
git clone https://github.com/takattowo/claude-certified-architect-study-plan.git
cd claude-certified-architect-study-plan
python -m venv .venv
# macOS / Linux
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
mkdocs serve
```

Site is live at `http://127.0.0.1:8000` with hot-reload.

## Style notes

- **Markdown only** in `docs/`
- **Checkboxes** use `- [ ]` (lowercase x for ticked: `- [x]`)
- **Admonitions** use MkDocs Material syntax: `!!! tip "Title"` then indent
- **Links** prefer relative paths within the site (`anti-patterns.md`, not the full URL)
- **Tone** terse and direct. Avoid filler. Match existing voice.

## Pull request flow

1. Fork
2. Create a branch: `git checkout -b fix/typo-in-module-3`
3. Edit. Run `mkdocs build --strict` to catch broken links.
4. Commit with a clear message
5. Open a PR with a one-line description and (if non-trivial) the rationale

## What we won't accept

- Unverified exam content from non-public sources
- Promotional links
- Major restructuring without an issue discussion first
- AI-generated bulk content without human review

## Disclaimer

This is unofficial. We don't have access to the actual exam questions and won't accept content claiming to come from them. Stick to publicly available source material from claudecertifications.com, the official Anthropic docs, and community knowledge.
