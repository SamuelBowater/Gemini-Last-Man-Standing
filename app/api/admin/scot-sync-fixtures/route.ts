import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { fetchScotFixtures } from "@/lib/scot-data";
import { withErrors } from "@/lib/api-wrapper";

const SCOT_SEASON = "spfl-2026-27";

export const POST = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  let fixtures;
  try {
    fixtures = await fetchScotFixtures();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach TheSportsDB.";
    return NextResponse.json({ ok: false, fixturesSynced: 0, message }, { status: 200 });
  }

  let count = 0;
  for (const f of fixtures) {
    await pool.query(
      `INSERT INTO fixtures (season, gw, home, away, kickoff, venue, status, home_score, away_score, source, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'api', $10)
       ON CONFLICT (season, gw, home, away)
       DO UPDATE SET kickoff = EXCLUDED.kickoff, venue = EXCLUDED.venue, status = EXCLUDED.status,
         home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score, source = 'api',
         external_id = EXCLUDED.external_id`,
      [
        SCOT_SEASON,
        f.gw,
        f.home,
        f.away,
        f.kickoff,
        f.venue,
        f.status,
        f.homeScore,
        f.awayScore,
        f.externalId,
      ]
    );
    count++;
  }

  return NextResponse.json({ ok: true, fixturesSynced: count });
});
