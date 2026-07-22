# Last Man Standing

A Premier League survival pool app. Everyone logs in with a 4-digit code,
picks a forward/midfielder/defender each gameweek, and is eliminated if
none of the three scores. Fixtures sync automatically once a day from
football-data.org.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Postgres** for all data (players, picks, results, fixtures) — works
  with Vercel Postgres or a free Neon database
- Deploys to **Vercel**, with a built-in daily **Cron Job** for fixture syncing

## 1. Create a database

Easiest path: in your Vercel project, go to **Storage → Create Database →
Postgres**. It will automatically add a `POSTGRES_URL` environment
variable for you. (A free Neon database at neon.tech works identically if
you'd rather not use Vercel's.)

The app creates its own tables the first time it runs — there's no schema
file to run by hand.

## 2. Environment variables

Set these in your Vercel project (**Settings → Environment Variables**),
or in `.env.local` for local development (copy `.env.example`):

| Variable | What it's for |
|---|---|
| `POSTGRES_URL` | Set automatically if you used Vercel Postgres |
| `ADMIN_PASSCODE` | A password you make up — protects `/admin` |
| `SESSION_SECRET` | A long random string you make up — signs the admin cookie |
| `FOOTBALL_DATA_API_KEY` | Your free token from football-data.org (register at https://www.football-data.org/client/register) |
| `CRON_SECRET` | A long random string you make up — Vercel sends this automatically to authorize the daily sync job (see below) |

## 3. Deploy

```bash
npm install
vercel deploy
```

Or push this to a GitHub repo and import it in the Vercel dashboard —
either way works.

## 4. Set up the daily fixtures sync

`vercel.json` already defines a cron job:

```json
{
  "crons": [{ "path": "/api/cron/sync-fixtures", "schedule": "0 0 * * *" }]
}
```

Vercel automatically sends your `CRON_SECRET` as a bearer token when it
calls this route, so as long as that env var is set, it's authorized with
no extra setup. It runs once a day at midnight UTC — edit the schedule
string (crontab.guru is handy) and redeploy to change the time.

To populate fixtures right away rather than waiting for the first cron
run, log into `/admin` and click **"Sync fixtures now"**.

## 5. Add your players

Go to `/admin`, log in with your `ADMIN_PASSCODE`, and add each player by
name. Each gets a random 4-digit code — send these out yourselves (text,
WhatsApp, whatever). Players log in at the homepage with their code.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

## How the game works

- Every gameweek, each alive player picks one forward, one midfielder,
  and one defender (autocomplete suggestions, but any name can be typed).
- A player can never be picked twice by the same person across the season
  — enforced server-side.
- Once you (the commissioner) know the results, go to `/admin` → **Results**
  and type in every player who scored that gameweek, comma-separated.
  Applying results eliminates anyone whose all three picks are missing
  from that list (or who didn't submit a pick at all), then advances the
  gameweek automatically. When only one player is left, the pool ends.
- The **Reset entire pool** button in the admin danger zone wipes players,
  picks and results to start a new season (fixtures data is kept, since
  it's tied to the season/gameweek rather than to a specific pool run).
