# Cron scheduling (spec 07)

The reminder jobs are exposed as two secret-protected HTTP endpoints. *What*
triggers them is a deployment choice — the app never assumes a specific
scheduler (00-overview.md §3).

| Endpoint | Cadence | Purpose |
|---|---|---|
| `POST/GET /api/cron/daily` | once a day, **07:00 Europe/Rome** | deadline reminders (30/7/1/0 days + "scaduta ieri") and therapy-intake generation |
| `POST/GET /api/cron/therapy` | **every 15 minutes** | dose-time reminders |

Both require `Authorization: Bearer $CRON_SECRET`; without it they return 401 and
do nothing. This bearer is the single auth mechanism — Vercel Cron is configured
to send it too (set `CRON_SECRET` as a project env var; Vercel forwards it on the
`Authorization` header).

## Option A — Vercel Cron (`vercel.json`)

`vercel.json` already declares both crons (`0 5 * * *` and `*/15 * * * *`).

> **Hobby plan limitation:** Vercel Hobby runs cron jobs at most **once per day**
> and does not honor sub-daily schedules — the `*/15` therapy cron will not fire.
> Use Option B for the 15-minute job (or upgrade to Pro).

Note the daily cron is set to `0 5 * * *` (**05:00 UTC**), which is 07:00 in Rome
during CEST (summer). In CET (winter) it lands at 06:00 Rome — close enough for a
"morning" reminder; tighten it per season only if you care.

## Option B — cron-job.org (free, sub-daily)

Create two jobs at <https://cron-job.org>, each adding a custom request header
`Authorization: Bearer <your CRON_SECRET>`:

- `https://<your-app>/api/cron/daily` — schedule 07:00 (set the job's timezone to
  Europe/Rome so DST is handled for you).
- `https://<your-app>/api/cron/therapy` — every 15 minutes.

<!-- TODO(spec-10): fold this into docs/SELF_HOSTING.md's deploy guide (§2.8) and
     remove this standalone file once spec 10 ships. -->
