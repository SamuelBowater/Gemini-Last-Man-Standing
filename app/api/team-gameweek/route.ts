import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { computePickDeadline } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";
import type { TeamGameweekReport, TeamGameweekRow, TeamTopPick } from "@/lib/team-types";
import { deriveTeamResult, findTeamFixture, type FixtureLike } from "@/lib/teams";

async function topTeamPicks(gw: number, fixtures: FixtureLike[]): Promise<TeamTopPick[]> {
  const { rows } = await pool.query(
    `SELECT team, count(*)::int AS picks
     FROM team_picks
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

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM team_state WHERE id = 1");
  const currentGW = gsRows[0].current_gw;
  const gw = Number(req.nextUrl.searchParams.get("gw")) || currentGW;

  const { rows: resultRows } = await pool.query("SELECT winning_teams FROM team_results WHERE gw = $1", [gw]);
  const resolved = resultRows.length > 0;
  const winningTeamsDisplay: string[] = resolved ? resultRows[0].winning_teams : [];

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, kickoff, status, home_score AS "homeScore", away_score AS "awayScore"
     FROM fixtures WHERE season = $1 AND gw = $2`,
    [gsRows[0].season, gw]
  );

  // Picks reveal once the gameweek is resolved, OR once its pick deadline has
  // passed — after the deadline nobody can submit or change a pick anymore,
  // so there's no more risk of copying, even if the admin hasn't applied
  // results yet. The win/draw/loss result is derived straight from the
  // synced fixture score, so it's safe to reveal alongside the pick itself.
  const deadline = computePickDeadline(fixtures.map((f) => f.kickoff));
  const picksLocked = Boolean(deadline && Date.now() >= new Date(deadline).getTime());
  const picksVisible = resolved || picksLocked;

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.team_status AS status, p.team_eliminated_gw AS "eliminatedGW",
            tp.team
     FROM participants p
     LEFT JOIN team_picks tp ON tp.participant_id = p.id AND tp.gw = $1
     WHERE p.can_play_teams = true
     ORDER BY
       CASE
         WHEN p.team_eliminated_gw IS NULL OR p.team_eliminated_gw > $1 THEN 0
         WHEN p.team_eliminated_gw = $1 THEN 1
         ELSE 2
       END,
       p.name ASC`,
    [gw]
  );

  const rowsMapped: TeamGameweekRow[] = rows.map((r) => {
    const hasPick = r.team !== null;
    const team = picksVisible ? r.team : null;
    const statusAsOfGW: "alive" | "eliminated" =
      r.eliminatedGW !== null && r.eliminatedGW <= gw ? "eliminated" : "alive";
    const fixture = hasPick ? findTeamFixture(fixtures, r.team) : undefined;
    return {
      id: r.id,
      name: r.name,
      overallStatus: statusAsOfGW,
      submitted: hasPick,
      team,
      result: picksVisible && hasPick ? deriveTeamResult(fixture, r.team) : null,
      eliminatedThisGW: r.eliminatedGW === gw,
    };
  });

  const { rows: statRows } = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE team_status != 'eliminated')::int AS "stillStanding",
            count(*) FILTER (WHERE team_status = 'eliminated')::int AS eliminated
     FROM participants WHERE can_play_teams = true`
  );
  const poolStats = statRows[0];

  const topPicks = picksVisible ? await topTeamPicks(gw, fixtures) : null;

  const report: TeamGameweekReport = {
    gw,
    currentGW,
    resolved,
    picksVisible,
    winningTeams: [...winningTeamsDisplay].sort(),
    rows: rowsMapped,
    poolStats,
    topPicks,
  };
  return NextResponse.json(report);
});
