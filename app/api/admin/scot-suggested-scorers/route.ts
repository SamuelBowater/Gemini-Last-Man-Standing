import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { fetchGameweekGoalScorers } from "@/lib/scot-data";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM scot_game_state WHERE id = 1");
  const gs = gsRows[0];

  const { rows: fixtureRows } = await pool.query(
    `SELECT external_id FROM fixtures
     WHERE season = $1 AND gw = $2 AND status = 'FINISHED' AND external_id IS NOT NULL`,
    [gs.season, gs.current_gw]
  );

  if (fixtureRows.length === 0) {
    return NextResponse.json({ ok: true, gw: gs.current_gw, scorers: [] });
  }

  const scorers = await fetchGameweekGoalScorers(fixtureRows.map((f) => f.external_id));
  return NextResponse.json({ ok: true, gw: gs.current_gw, scorers });
});
