import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { withErrors } from "@/lib/api-wrapper";
import type { TeamGameweekReport, TeamGameweekRow, TeamTopPick } from "@/lib/team-types";
import { deriveTeamResult, findTeamFixture, type FixtureLike } from "@/lib/teams";

async function topTeamPicks(gw: number, fixtures: FixtureLike[]): Promise<TeamTopPick[]> {
  const { rows } = await pool.query(
    `SELECT team, count(*)::int AS picks
     FROM scot_team_picks
     WHERE gw = $1
     GROUP BY team
     ORDER BY picks DESC, team ASC
     LIMIT 3`,
    [gw]
  );
  return rows.map((r) => ({
    team: r.team,
    picks: r.picks,
    result: deriveTeamResult(findTeamFixture(fixtures, r.team), r.team),
  }));
}

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM scot_team_state WHERE id = 1");
  const currentGW = gsRows[0].current_gw;
  const gw = Number(req.nextUrl.searchParams.get("gw")) || currentGW;

  const { rows: resultRows } = await pool.query("SELECT winning_teams FROM scot_team_results WHERE gw = $1", [gw]);
  const resolved = resultRows.length > 0;
  const winningTeamsDisplay: string[] = resolved ? resultRows[0].winning_teams : [];

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, status, home_score AS "homeScore", away_score AS "awayScore"
     FROM fixtures WHERE season = $1 AND gw = $2`,
    [gsRows[0].season, gw]
  );

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.scot_team_status AS status, p.scot_team_eliminated_gw AS "eliminatedGW",
            tp.team
     FROM participants p
     LEFT JOIN scot_team_picks tp ON tp.participant_id = p.id AND tp.gw = $1
     WHERE p.can_play_scot_teams = true
     ORDER BY
       CASE
         WHEN p.scot_team_eliminated_gw IS NULL OR p.scot_team_eliminated_gw > $1 THEN 0
         WHEN p.scot_team_eliminated_gw = $1 THEN 1
         ELSE 2
       END,
       p.name ASC`,
    [gw]
  );

  const rowsMapped: TeamGameweekRow[] = rows.map((r) => {
    const hasPick = r.team !== null;
    const team = resolved ? r.team : null;
    const statusAsOfGW: "alive" | "eliminated" =
      r.eliminatedGW !== null && r.eliminatedGW <= gw ? "eliminated" : "alive";
    const fixture = hasPick ? findTeamFixture(fixtures, r.team) : undefined;
    return {
      id: r.id,
      name: r.name,
      overallStatus: statusAsOfGW,
      submitted: hasPick,
      team,
      result: resolved && hasPick ? deriveTeamResult(fixture, r.team) : null,
      eliminatedThisGW: r.eliminatedGW === gw,
    };
  });

  const { rows: statRows } = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE scot_team_status != 'eliminated')::int AS "stillStanding",
            count(*) FILTER (WHERE scot_team_status = 'eliminated')::int AS eliminated
     FROM participants WHERE can_play_scot_teams = true`
  );
  const poolStats = statRows[0];

  const topPicks = resolved ? await topTeamPicks(gw, fixtures) : null;

  const report: TeamGameweekReport = {
    gw,
    currentGW,
    resolved,
    winningTeams: [...winningTeamsDisplay].sort(),
    rows: rowsMapped,
    poolStats,
    topPicks,
  };
  return NextResponse.json(report);
});
