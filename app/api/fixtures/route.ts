import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { officialFixturesUrl } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";
import { fetchGameweekScorers, normalizeTeamName } from "@/lib/players";

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();

  const { rows: gsRows } = await pool.query(
    "SELECT current_gw, season FROM game_state WHERE id = 1"
  );
  const gs = gsRows[0];

  const gw = Number(req.nextUrl.searchParams.get("gw")) || gs.current_gw;

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, kickoff, venue, status,
            home_score AS "homeScore", away_score AS "awayScore"
     FROM fixtures WHERE season = $1 AND gw = $2 ORDER BY kickoff ASC NULLS LAST`,
    [gs.season, gw]
  );

  const scorersByTeam = new Map<string, string[]>();
  try {
    const scorerMap = await fetchGameweekScorers(gw);
    if (scorerMap.size > 0) {
      const { rows: playerRows } = await pool.query(
        `SELECT fpl_id AS "fplId", name, team FROM players`
      );
      for (const p of playerRows) {
        const goals = scorerMap.get(p.fplId);
        if (!goals) continue;
        const label = goals > 1 ? `${p.name} (${goals})` : p.name;
        const list = scorersByTeam.get(p.team) || [];
        list.push(label);
        scorersByTeam.set(p.team, list);
      }
    }
  } catch {
    // best-effort — fixtures still render fine without scorer info
  }

  const fixturesWithScorers = fixtures.map((f) => ({
    ...f,
    homeScorers: scorersByTeam.get(normalizeTeamName(f.home)) || [],
    awayScorers: scorersByTeam.get(normalizeTeamName(f.away)) || [],
  }));

  return NextResponse.json({
    fixtures: fixturesWithScorers,
    gw,
    currentGW: gs.current_gw,
    officialFixturesUrl: officialFixturesUrl(gs.season, gw),
  });
});
