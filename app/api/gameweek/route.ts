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

  const { rows: gsRows } = await pool.query("SELECT current_gw FROM game_state WHERE id = 1");
  const currentGW = gsRows[0].current_gw;
  const gw = Number(req.nextUrl.searchParams.get("gw")) || currentGW;

  const { rows: resultRows } = await pool.query("SELECT scorers FROM results WHERE gw = $1", [gw]);
  const resolved = resultRows.length > 0;
  const scorerSet = new Set<string>(
    resolved ? (resultRows[0].scorers as string[]).map((s) => s.toLowerCase()) : []
  );
  const scored = (name: string | null) => (name ? scorerSet.has(name.toLowerCase()) : false);

  // Only reveal pick contents once the gameweek is resolved — otherwise
  // players could copy each other's live picks before they lock in.
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.status, p.eliminated_gw AS "eliminatedGW",
            pk.forward, pk.midfielder, pk.defender
     FROM participants p
     LEFT JOIN picks pk ON pk.participant_id = p.id AND pk.gw = $1
     ORDER BY (p.status = 'eliminated') ASC, p.name ASC`,
    [gw]
  );

  const players: GameweekPlayerRow[] = rows.map((r) => {
    const hasPick = r.forward !== null;
    const forward = resolved ? r.forward : null;
    const midfielder = resolved ? r.midfielder : null;
    const defender = resolved ? r.defender : null;
    return {
      id: r.id,
      name: r.name,
      overallStatus: r.status,
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
            count(*) FILTER (WHERE status != 'eliminated')::int AS "stillStanding",
            count(*) FILTER (WHERE status = 'eliminated')::int AS eliminated
     FROM participants`
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
