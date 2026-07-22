import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { fetchGameweekScorers } from "@/lib/players";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { rows: gsRows } = await pool.query("SELECT current_gw FROM game_state WHERE id = 1");
  const gw = gsRows[0].current_gw;

  let scorerMap;
  try {
    scorerMap = await fetchGameweekScorers(gw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach the FPL API.";
    return NextResponse.json({ ok: false, gw, scorers: [], message });
  }

  if (scorerMap.size === 0) {
    return NextResponse.json({ ok: true, gw, scorers: [] });
  }

  const { rows: playerRows } = await pool.query(`SELECT fpl_id AS "fplId", name FROM players`);
  const names = playerRows.filter((p) => scorerMap.has(p.fplId)).map((p) => p.name);

  return NextResponse.json({ ok: true, gw, scorers: names.sort() });
});
