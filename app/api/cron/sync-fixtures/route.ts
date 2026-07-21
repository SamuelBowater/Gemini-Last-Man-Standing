import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { extractRoundNumber } from "@/lib/game";
import { PL_LEAGUE_ID } from "@/lib/data";

async function authorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return isAdmin();
}

export async function GET(req: NextRequest) {
  await ensureSchema();
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY isn't set." }, { status: 500 });
  }

  const { rows: gsRows } = await pool.query("SELECT season, api_season FROM game_state WHERE id = 1");
  const gs = gsRows[0];

  try {
    const url = `https://v3.football.api-sports.io/fixtures?league=${PL_LEAGUE_ID}&season=${gs.api_season}`;
    const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      await pool.query(
        "UPDATE sync_meta SET last_error = $1 WHERE id = 1",
        [`API-Football responded ${resp.status}: ${text.slice(0, 300)}`]
      );
      return NextResponse.json({ error: `API-Football responded ${resp.status}` }, { status: 502 });
    }

    const data = await resp.json();
    let count = 0;

    for (const item of data.response || []) {
      const roundNum = extractRoundNumber(item.league?.round);
      if (roundNum === null) continue;
      const home = item.teams?.home?.name;
      const away = item.teams?.away?.name;
      if (!home || !away) continue;

      await pool.query(
        `INSERT INTO fixtures (season, gw, home, away, kickoff, venue, status, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'api')
         ON CONFLICT (season, gw, home, away)
         DO UPDATE SET kickoff = EXCLUDED.kickoff, venue = EXCLUDED.venue, status = EXCLUDED.status, source = 'api'`,
        [
          gs.season,
          roundNum,
          home,
          away,
          item.fixture?.date || null,
          item.fixture?.venue?.name || null,
          item.fixture?.status?.short || null,
        ]
      );
      count++;
    }

    await pool.query("UPDATE sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
    return NextResponse.json({ ok: true, fixturesSynced: count });
  } catch (err) {
    await pool.query("UPDATE sync_meta SET last_error = $1 WHERE id = 1", [String(err)]);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
