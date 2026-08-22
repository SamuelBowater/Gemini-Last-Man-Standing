import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { fetchGameweekScorers } from "@/lib/players";
import { withErrors } from "@/lib/api-wrapper";

// Live, unofficial scorer names for the current gameweek, sourced straight from
// the FPL live feed — same data the admin's "Check live data" button uses. This
// is provisional: it can lag or occasionally differ from the official result the
// admin later applies, so it's only used for an in-progress hint on the picks
// page, never for elimination logic.
export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await getCurrentParticipantId())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw FROM game_state WHERE id = 1");
  const gw = gsRows[0].current_gw;

  let scorerMap;
  try {
    scorerMap = await fetchGameweekScorers(gw);
  } catch {
    return NextResponse.json({ ok: false, gw, scorers: [] });
  }

  if (scorerMap.size === 0) {
    return NextResponse.json({ ok: true, gw, scorers: [] });
  }

  const { rows: playerRows } = await pool.query(`SELECT fpl_id AS "fplId", name FROM players`);
  const names = playerRows.filter((p) => scorerMap.has(p.fplId)).map((p) => p.name);

  return NextResponse.json({ ok: true, gw, scorers: names.sort() });
});
