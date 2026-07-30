import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { computeWinningTeams } from "@/lib/teams";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM scot_team_state WHERE id = 1");
  const gs = gsRows[0];

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, status, home_score AS "homeScore", away_score AS "awayScore"
     FROM fixtures WHERE season = $1 AND gw = $2`,
    [gs.season, gs.current_gw]
  );

  const winningTeams = computeWinningTeams(fixtures);

  return NextResponse.json({ ok: true, gw: gs.current_gw, winningTeams });
});
