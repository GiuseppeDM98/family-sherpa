---
spec: 10
title: Open-source packaging, deploy guide, launch checklist
depends_on: [01, 02, 03, 04, 05, 06, 07, 08, 09]
complexity: low-medium
---

# 10 — Packaging open source, deploy su Vercel, lancio

## Goal

Make the repo something a stranger can star, understand in 90 seconds, and self-host in 30 minutes — and give the author everything needed for the LinkedIn launch.

## Scope

- Full README rewrite (with screenshots), SELF_HOSTING guide, CONTRIBUTING, issue/PR templates, security policy.
- `vercel.json` review + production deploy walkthrough (executed together with the user).
- Demo seed polish and screenshot set.
- LinkedIn launch kit (draft post + asset checklist) in `docs/launch/`.

**Non-scope:** new product features; CI already exists (spec 01).

## 1. README.md (rewrite)

Structure, in English:
1. Logo/title + one-liner + badges (license AGPL-3.0, PRs welcome, CI status).
2. **The problem** (3 lines on Italian family mental load — bollo, TARI, PagoPA, pediatra) and **the fix** (forward it to a bot, tap Conferma).
3. **Demo**: GIF or 3–4 screenshots side by side (Telegram parse+confirm, dashboard, asset timeline, meds). Store in `docs/assets/`. Capture from the seeded demo family — never real personal data.
4. **Features** (the 4 MVP pillars, one line + screenshot each).
5. **How it works**: the mermaid architecture diagram from `docs/specs/00-overview.md` §3, simplified.
6. **Self-hosting**: teaser + link to `docs/SELF_HOSTING.md`.
7. **Privacy**: honest paragraph — at-rest field encryption, what the LLM sees, what providers are involved (Anthropic, Groq, Telegram), zero-knowledge on the roadmap.
8. Tech stack table, contributing link, license.

## 2. docs/SELF_HOSTING.md

Numbered end-to-end walkthrough, tested by actually following it during this session:
1. Fork/clone; `pnpm install`.
2. Turso: create DB, get URL+token (CLI commands).
3. Google OAuth client (console steps, both localhost and prod redirect URIs).
4. Telegram: @BotFather steps, `pnpm telegram:setup`.
5. Keys: Anthropic, Groq, `ENCRYPTION_KEY`, VAPID generation, `CRON_SECRET` — the full `.env.example` annotated.
6. Local run: migrate, seed, dev, tunnel for the webhook.
7. **Vercel deploy**: import repo, env vars checklist (every var from 00-overview §7), set `NEXT_PUBLIC_APP_URL`, run `pnpm telegram:setup` against prod, apply migrations against Turso.
8. Cron scheduling: `vercel.json` crons (note Hobby limitations) **and** the free alternative — cron-job.org jobs hitting `/api/cron/daily` (07:00 Europe/Rome) and `/api/cron/therapy` (every 15 min) with the `Authorization: Bearer` header. Resolve the TODO pointer left by spec 07.
9. Troubleshooting table (webhook 401, push not arriving on iOS, Turso auth errors).

## 3. Community files

- `CONTRIBUTING.md`: dev setup (points at SELF_HOSTING), spec-driven workflow explanation (docs/specs is the source of truth), conventional commits, PR checklist (`lint`/`typecheck`/`test`).
- `.github/ISSUE_TEMPLATE/bug_report.yml` + `feature_request.yml` (simple forms), `.github/pull_request_template.md`.
- `SECURITY.md`: private disclosure via email; note on the encryption model and that self-hosters own their keys.
- Repo metadata to set on GitHub (do via `gh` CLI with the user): description ("Open-source AI assistant that carries your family's mental load — Italian bureaucracy edition 🇮🇹"), topics (`nextjs`, `ai`, `claude`, `telegram-bot`, `pwa`, `family`, `italy`, `turso`), social preview note.

## 4. Deploy (interactive)

This part is executed with the user (accounts/secrets are theirs): Vercel project creation, env vars, prod webhook, one real end-to-end test on production (send a real PagoPA/bill to the bot, confirm, see it on the phone-installed PWA). Fix anything the walkthrough exposes and fold fixes back into SELF_HOSTING.md.

## 5. docs/launch/linkedin.md

- Draft LinkedIn post in **Italian**: hook on mental load (concrete: "TARI, bollo, revisione, il pediatra…"), the passive-capture demo moment ("inoltri il PDF su Telegram, l'AI fa il resto"), open source + self-hostable + privacy angle, tech stack line for the dev audience, CTA to the repo. Keep it human, no hashtag walls (≤5).
- Asset checklist: 30–60s screen recording script (send voice note → confirmation → dashboard), 2 screenshots, alt text.
- Post-launch checklist: pin repo, enable Discussions, respond window, cross-post (r/selfhosted, HN Show HN — optional).

## Acceptance criteria

1. A fresh machine (or fresh clone + wiped env) can reach a working local setup following SELF_HOSTING.md alone — every command copy-pasteable.
2. Production deploy on Vercel completes; the prod bot parses a real document end-to-end; cron endpoints respond 200 with the bearer and 401 without.
3. README renders correctly on GitHub with images; all links valid.
4. Community files present; `gh repo view` shows description + topics.
5. `docs/launch/linkedin.md` contains the post draft and checklists.

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **medium** — set via `/model` before pasting. (Documentation and interactive deploy; no complex logic.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/10-launch.md
in this repository, following CLAUDE.md.

This spec is partly interactive: for the Vercel deploy, GitHub metadata and
production tests, walk me through it step by step and wait for my input where
my accounts are involved. Write all documentation by verifying commands
against the actual codebase — do not document from assumption; where a step
can't be verified without my accounts, mark it clearly and ask me to confirm.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
in particular the full production end-to-end test script and a final
pre-launch checklist.
```
