import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { fetchGameweekScorers, normalizeTeamName } from "@/lib/players";
import { withErrors } from "@/lib/api-wrapper";

const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

// Live, unofficial per-player status for the current gameweek, sourced straight
// from the FPL live feed for goals — same data the admin's "Check live data"
// button uses — combined with our own synced fixture status. This is
// provisional: it can lag or occasionally differ from the official result the
// admin later applies, so it's only used for an in-progress hint on the picks
// page, never for elimination logic. A player only shows as a red "no goal"
// once their match has actually finished — while it's still 0-0 and the match
// is live, or hasn't kicked off, that's "in_progress" / left out entirely
// rather than marked as a loss.
export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await getCurrentParticipantId())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM game_state WHERE id = 1");
  const gw = gsRows[0].current_gw;
  const season = gsRows[0].season;

  let scorerMap;
  try {
    scorerMap = await fetchGameweekScorers(gw);
  } catch {
    return NextResponse.json({ ok: false, gw, players: {} });
  }

  const { rows: fixtureRows } = await pool.query(
    "SELECT home, away, status FROM fixtures WHERE season = $1 AND gw = $2",
    [season, gw]
  );
  const finishedTeams = new Set<string>();
  const startedTeams = new Set<string>();
  for (const f of fixtureRows) {
    const home = normalizeTeamName(f.home);
    const away = normalizeTeamName(f.away);
    if (FINISHED_STATUSES.has(f.status || "")) {
      finishedTeams.add(home);
      finishedTeams.add(away);
    } else if (f.status && f.status !== "SCHEDULED" && f.status !== "TIMED" && f.status !== "POSTPONED") {
      startedTeams.add(home);
      startedTeams.add(away);
    }
  }

  const { rows: playerRows } = await pool.query(`SELECT fpl_id AS "fplId", name, team FROM players`);
  const players: Record<string, "scored" | "no_goal" | "in_progress"> = {};
  for (const p of playerRows) {
    const scored = scorerMap.has(p.fplId);
    if (scored) {
      players[p.name.toLowerCase()] = "scored";
    } else if (finishedTeams.has(p.team)) {
      players[p.name.toLowerCase()] = "no_goal";
    } else if (startedTeams.has(p.team)) {
      players[p.name.toLowerCase()] = "in_progress";
    }
    // else: match hasn't started — omitted, frontend treats as "not started yet"
  }

  return NextResponse.json({ ok: true, gw, players });
});
