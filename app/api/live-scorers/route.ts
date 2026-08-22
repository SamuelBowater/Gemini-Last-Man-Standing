import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { fetchGameweekLiveStats } from "@/lib/players";
import { withErrors } from "@/lib/api-wrapper";

// Live, unofficial per-player status for the current gameweek, sourced straight
// from the FPL live feed — same data the admin's "Check live data" button uses.
// This is provisional: it can lag or occasionally differ from the official result
// the admin later applies, so it's only used for an in-progress hint on the picks
// page, never for elimination logic. Players who haven't kicked off yet (minutes
// still 0) are left out entirely so the frontend can tell "not started" apart
// from "played and didn't score" instead of lumping both in as a red "no".
export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await getCurrentParticipantId())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw FROM game_state WHERE id = 1");
  const gw = gsRows[0].current_gw;

  let statsMap;
  try {
    statsMap = await fetchGameweekLiveStats(gw);
  } catch {
    return NextResponse.json({ ok: false, gw, players: {} });
  }

  if (statsMap.size === 0) {
    return NextResponse.json({ ok: true, gw, players: {} });
  }

  const { rows: playerRows } = await pool.query(`SELECT fpl_id AS "fplId", name FROM players`);
  const players: Record<string, "scored" | "no_goal"> = {};
  for (const p of playerRows) {
    const stats = statsMap.get(p.fplId);
    if (!stats || stats.minutes === 0) continue;
    players[p.name.toLowerCase()] = stats.goals > 0 ? "scored" : "no_goal";
  }

  return NextResponse.json({ ok: true, gw, players });
});
