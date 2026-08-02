import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { FD_COMPETITION_CODE } from "@/lib/data";
import { syncScotFixtures } from "@/lib/scot-data";
import { withErrors } from "@/lib/api-wrapper";

async function authorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return isAdmin();
}

interface FDMatch {
  matchday: number | null;
  utcDate: string;
  venue?: string | null;
  status?: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  score?: { fullTime?: { home?: number | null; away?: number | null } };
}

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  // Runs alongside the English sync below so both leagues update from the same
  // nightly cron trigger — Vercel's free plan caps cron jobs at 2, so this avoids
  // needing a third schedule entry just for the Scottish Premiership.
  const scot = await syncScotFixtures().catch((err) => ({
    ok: false,
    fixturesSynced: 0,
    message: err instanceof Error ? err.message : "Scottish fixtures sync failed.",
  }));

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY isn't set.", scot }, { status: 500 });
  }

  const { rows: gsRows } = await pool.query("SELECT season FROM game_state WHERE id = 1");
  const gs = gsRows[0];

  // No season param — football-data.org's free plan only serves whatever
  // season it currently considers "current" for the competition, which is
  // exactly what we want (this call returns the WHOLE season in one go,
  // every match already tagged with its own matchday number).
  const url = `https://api.football-data.org/v4/competitions/${FD_COMPETITION_CODE}/matches`;
  const resp = await fetch(url, { headers: { "X-Auth-Token": apiKey } });
  const rawText = await resp.text();

  let data: { matches?: FDMatch[]; message?: string; errorCode?: number } | null = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    // leave null — diagnostics below will surface rawText
  }

  const diagnostics = {
    requestedUrl: url,
    httpStatus: resp.status,
    apiMessage: data?.message ?? null,
    matchesReturned: data?.matches?.length ?? null,
    rawSample: !data ? rawText.slice(0, 500) : undefined,
  };

  if (!resp.ok || !data || !data.matches) {
    const message = data?.message
      ? `football-data.org error: ${data.message}`
      : `football-data.org responded HTTP ${resp.status}.`;
    await pool.query("UPDATE sync_meta SET last_error = $1 WHERE id = 1", [
      `${message} ${JSON.stringify(diagnostics)}`.slice(0, 2000),
    ]);
    return NextResponse.json({ ok: false, fixturesSynced: 0, message, diagnostics, scot }, { status: 200 });
  }

  // One batched multi-row upsert instead of one round-trip per match — with
  // a full season (~380 matches) that was taking 30+ seconds sequentially,
  // long enough to trip an external scheduler's request timeout.
  const values: unknown[] = [];
  const valueRows: string[] = [];
  for (const match of data.matches) {
    const gw = match.matchday;
    const home = match.homeTeam?.name;
    const away = match.awayTeam?.name;
    if (gw === null || gw === undefined || !home || !away) continue;

    const base = values.length;
    valueRows.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, 'api')`
    );
    values.push(
      gs.season,
      gw,
      home,
      away,
      match.utcDate || null,
      match.venue || null,
      match.status || null,
      match.score?.fullTime?.home ?? null,
      match.score?.fullTime?.away ?? null
    );
  }

  if (valueRows.length > 0) {
    await pool.query(
      `INSERT INTO fixtures (season, gw, home, away, kickoff, venue, status, home_score, away_score, source)
       VALUES ${valueRows.join(", ")}
       ON CONFLICT (season, gw, home, away)
       DO UPDATE SET kickoff = EXCLUDED.kickoff, venue = EXCLUDED.venue, status = EXCLUDED.status,
         home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score, source = 'api'`,
      values
    );
  }
  const count = valueRows.length;

  await pool.query("UPDATE sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
  return NextResponse.json({ ok: true, fixturesSynced: count, diagnostics, scot });
});
