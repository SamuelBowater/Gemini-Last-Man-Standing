import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { extractRoundNumber } from "@/lib/game";
import { PL_LEAGUE_ID } from "@/lib/data";
import { withErrors } from "@/lib/api-wrapper";

async function authorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return isAdmin();
}

export const GET = withErrors(async (req: NextRequest) => {
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

  const url = `https://v3.football.api-sports.io/fixtures?league=${PL_LEAGUE_ID}&season=${gs.api_season}`;
  const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  const data = await resp.json().catch(() => null);

  if (!resp.ok || !data) {
    const message = `API-Football responded ${resp.status}`;
    await pool.query("UPDATE sync_meta SET last_error = $1 WHERE id = 1", [message]);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // API-Football returns 200 with an empty response array (not an HTTP error)
  // for things like an unsupported season on the free plan, a bad param, or
  // a plan restriction — so check its own error/results fields explicitly.
  const apiErrors = data.errors;
  const hasApiErrors =
    apiErrors && (Array.isArray(apiErrors) ? apiErrors.length > 0 : Object.keys(apiErrors).length > 0);

  if (hasApiErrors) {
    const message = `API-Football error: ${JSON.stringify(apiErrors)}`;
    await pool.query("UPDATE sync_meta SET last_error = $1 WHERE id = 1", [message]);
    return NextResponse.json({ error: message, apiErrors, resultsFromApi: data.results ?? 0 }, { status: 502 });
  }

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

  if (count === 0) {
    // Not an error exactly, but worth surfacing why: API responded fine but
    // had nothing usable for this season/league combination.
    const message = `API-Football returned ${data.results ?? 0} raw result(s) for season=${gs.api_season}, but none matched a parseable gameweek. This usually means the season parameter isn't covered by your plan, or hasn't been published yet.`;
    await pool.query("UPDATE sync_meta SET last_synced_at = now(), last_error = $1 WHERE id = 1", [message]);
    return NextResponse.json({ ok: true, fixturesSynced: 0, resultsFromApi: data.results ?? 0, note: message });
  }

  await pool.query("UPDATE sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
  return NextResponse.json({ ok: true, fixturesSynced: count, resultsFromApi: data.results ?? 0 });
});
