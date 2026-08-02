import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { computePickDeadline } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";
import type { GameweekPlayerRow, GameweekReport, TopPick } from "@/lib/types";

async function topPicksFor(
  gw: number,
  column: "forward" | "midfielder" | "defender",
  scored: (name: string | null) => boolean
): Promise<TopPick[]> {
  const { rows } = await pool.query(
    `SELECT ${column} AS name, count(*)::int AS picks
     FROM picks
     WHERE gw = $1
     GROUP BY ${column}
     ORDER BY picks DESC, name ASC
     LIMIT 3`,
    [gw]
  );
  return rows.map((r) => ({ name: r.name, picks: r.picks, scored: scored(r.name) }));
}

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM game_state WHERE id = 1");
  const currentGW = gsRows[0].current_gw;
  const season = gsRows[0].season;
  const gw = Number(req.nextUrl.searchParams.get("gw")) || currentGW;

  const { rows: resultRows } = await pool.query("SELECT scorers FROM results WHERE gw = $1", [gw]);
  const resolved = resultRows.length > 0;
  const scorerSet = new Set<string>(
    resolved ? (resultRows[0].scorers as string[]).map((s) => s.toLowerCase()) : []
  );
  const scored = (name: string | null) => (name ? scorerSet.has(name.toLowerCase()) : false);

  // Picks reveal once the gameweek is resolved, OR once its pick deadline has
  // passed — after the deadline nobody can submit or change a pick anymore,
  // so there's no more risk of copying, even if the admin hasn't applied
  // results yet.
  const { rows: fixtureRows } = await pool.query(
    "SELECT kickoff FROM fixtures WHERE season = $1 AND gw = $2",
    [season, gw]
  );
  const deadline = computePickDeadline(fixtureRows.map((f) => f.kickoff));
  const picksLocked = Boolean(deadline && Date.now() >= new Date(deadline).getTime());
  const picksVisible = resolved || picksLocked;

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.status, p.eliminated_gw AS "eliminatedGW",
            pk.forward, pk.midfielder, pk.defender
     FROM participants p
     LEFT JOIN picks pk ON pk.participant_id = p.id AND pk.gw = $1
     ORDER BY
       CASE
         WHEN p.eliminated_gw IS NULL OR p.eliminated_gw > $1 THEN 0
         WHEN p.eliminated_gw = $1 THEN 1
         ELSE 2
       END,
       p.name ASC`,
    [gw]
  );

  const { rows: playerRows } = await pool.query(`SELECT name, team FROM players`);
  const teamByPlayer = new Map<string, string>(
    playerRows.map((p) => [String(p.name).toLowerCase(), p.team])
  );
  const teamFor = (name: string | null) => (name ? teamByPlayer.get(name.toLowerCase()) || null : null);

  const players: GameweekPlayerRow[] = rows.map((r) => {
    const hasPick = r.forward !== null;
    const forward = picksVisible ? r.forward : null;
    const midfielder = picksVisible ? r.midfielder : null;
    const defender = picksVisible ? r.defender : null;
    // Status as of THIS gameweek, not the participant's current/final status —
    // otherwise someone eliminated in a later week would wrongly show as
    // "Eliminated" when looking back at an earlier week they were still in.
    const statusAsOfGW: "alive" | "eliminated" =
      r.eliminatedGW !== null && r.eliminatedGW <= gw ? "eliminated" : "alive";
    return {
      id: r.id,
      name: r.name,
      overallStatus: statusAsOfGW,
      submitted: hasPick,
      forward,
      midfielder,
      defender,
      forwardTeam: teamFor(forward),
      midfielderTeam: teamFor(midfielder),
      defenderTeam: teamFor(defender),
      forwardScored: resolved && hasPick ? scored(r.forward) : null,
      midfielderScored: resolved && hasPick ? scored(r.midfielder) : null,
      defenderScored: resolved && hasPick ? scored(r.defender) : null,
      survived: resolved ? (hasPick ? scored(r.forward) || scored(r.midfielder) || scored(r.defender) : false) : null,
      eliminatedThisGW: r.eliminatedGW === gw,
    };
  });

  const { rows: statRows } = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status != 'eliminated')::int AS "stillStanding",
            count(*) FILTER (WHERE status = 'eliminated')::int AS eliminated
     FROM participants`
  );
  const poolStats = statRows[0];

  const topPicks = picksVisible
    ? {
        forward: await topPicksFor(gw, "forward", scored),
        midfielder: await topPicksFor(gw, "midfielder", scored),
        defender: await topPicksFor(gw, "defender", scored),
      }
    : null;

  const report: GameweekReport = {
    gw,
    currentGW,
    resolved,
    picksVisible,
    scorers: Array.from(scorerSet).sort(),
    players,
    poolStats,
    topPicks,
  };
  return NextResponse.json(report);
});
