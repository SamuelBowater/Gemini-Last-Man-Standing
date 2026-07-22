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
  const rawText = await resp.text();
  let data: {
    errors?: unknown;
    results?: number;
    response?: Array<{
      league?: { round?: string };
      teams?: { home?: { name?: string }; away?: { name?: string } };
      fixture?: { date?: string; venue?: { name?: string }; status?: { short?: string } };
    }>;
  } | null = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    // not JSON — leave data null, diagnostics below will surface rawText
  }

  const apiErrors = data?.errors;
  const hasApiErrors =
    !!apiErrors && (Array.isArray(apiErrors) ? apiErrors.length > 0 : Object.keys(apiErrors).length > 0);

  const diagnostics = {
    requestedUrl: url,
    httpStatus: resp.status,
    apiErrors: apiErrors ?? null,
    resultsFromApi: data?.results ?? null,
    rawSample: !data ? rawText.slice(0, 500) : undefined,
  };

  if (!resp.ok || !data || hasApiErrors || (data.response || []).length === 0) {
    const message = hasApiErrors
      ? `API-Football reported an error: ${JSON.stringify(apiErrors)}`
      : !resp.ok
      ? `API-Football responded HTTP ${resp.status}.`
      : `API-Football responded OK but with 0 fixtures for season=${gs.api_season}.`;
    await pool.query("UPDATE sync_meta SET last_error = $1 WHERE id = 1", [
      `${message} ${JSON.stringify(diagnostics)}`.slice(0, 2000),
    ]);
    return NextResponse.json({ ok: false, fixturesSynced: 0, message, diagnostics }, { status: 200 });
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

  await pool.query("UPDATE sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
  return NextResponse.json({ ok: true, fixturesSynced: count, diagnostics });
});
