import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { withErrors } from "@/lib/api-wrapper";
import type { GameweekPlayerRow, GameweekReport, TopPick } from "@/lib/types";

async function topPicksFor(
  gw: number,
  column: "forward" | "midfielder" | "defender",
  scored: (name: string | null) => boolean
): Promise<TopPick[]> {
  const { rows } = await pool.query(
    `SELECT ${column} AS name, count(*)::int AS picks
     FROM scot_picks
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

  const { rows: gsRows } = await pool.query("SELECT current_gw FROM scot_game_state WHERE id = 1");
  const currentGW = gsRows[0].current_gw;
  const gw = Number(req.nextUrl.searchParams.get("gw")) || currentGW;

  const { rows: resultRows } = await pool.query("SELECT scorers FROM scot_results WHERE gw = $1", [gw]);
  const resolved = resultRows.length > 0;
  const scorerSet = new Set<string>(
    resolved ? (resultRows[0].scorers as string[]).map((s) => s.toLowerCase()) : []
  );
  const scored = (name: string | null) => (name ? scorerSet.has(name.toLowerCase()) : false);

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.scot_status AS status, p.scot_eliminated_gw AS "eliminatedGW",
            pk.forward, pk.midfielder, pk.defender
     FROM participants p
     LEFT JOIN scot_picks pk ON pk.participant_id = p.id AND pk.gw = $1
     WHERE p.can_play_scot_players = true
     ORDER BY
       CASE
         WHEN p.scot_eliminated_gw IS NULL OR p.scot_eliminated_gw > $1 THEN 0
         WHEN p.scot_eliminated_gw = $1 THEN 1
         ELSE 2
       END,
       p.name ASC`,
    [gw]
  );

  const players: GameweekPlayerRow[] = rows.map((r) => {
    const hasPick = r.forward !== null;
    const forward = resolved ? r.forward : null;
    const midfielder = resolved ? r.midfielder : null;
    const defender = resolved ? r.defender : null;
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
      forwardScored: resolved && hasPick ? scored(r.forward) : null,
      midfielderScored: resolved && hasPick ? scored(r.midfielder) : null,
      defenderScored: resolved && hasPick ? scored(r.defender) : null,
      survived: resolved ? (hasPick ? scored(r.forward) || scored(r.midfielder) || scored(r.defender) : false) : null,
      eliminatedThisGW: r.eliminatedGW === gw,
    };
  });

  const { rows: statRows } = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE scot_status != 'eliminated')::int AS "stillStanding",
            count(*) FILTER (WHERE scot_status = 'eliminated')::int AS eliminated
     FROM participants WHERE can_play_scot_players = true`
  );
  const poolStats = statRows[0];

  const topPicks = resolved
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
    scorers: Array.from(scorerSet).sort(),
    players,
    poolStats,
    topPicks,
  };
  return NextResponse.json(report);
});
