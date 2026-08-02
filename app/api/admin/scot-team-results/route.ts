import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { deriveTeamResult, findTeamFixture } from "@/lib/teams";
import { sendPushToGamePlayers } from "@/lib/push";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { winningTeams } = await req.json().catch(() => ({ winningTeams: [] }));
  const winningTeamsDisplay = Array.from(new Set((winningTeams as string[]).map((t) => t.trim())));
  const winnerSet = new Set(winningTeamsDisplay.map((t) => t.toLowerCase()));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: gsRows } = await client.query(
      "SELECT current_gw, season, phase FROM scot_team_state WHERE id = 1 FOR UPDATE"
    );
    const gs = gsRows[0];
    if (gs.phase !== "picking") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This gameweek has already been resolved." }, { status: 400 });
    }

    const { rows: fixtures } = await client.query(
      `SELECT home, away, status, home_score AS "homeScore", away_score AS "awayScore"
       FROM fixtures WHERE season = $1 AND gw = $2`,
      [gs.season, gs.current_gw]
    );

    const { rows: picks } = await client.query(
      `SELECT tp.participant_id, tp.team
       FROM scot_team_picks tp
       JOIN participants p ON p.id = tp.participant_id
       WHERE tp.gw = $1 AND p.can_play_scot_teams = true`,
      [gs.current_gw]
    );

    const pendingTeams = new Set<string>();
    for (const p of picks) {
      const fixture = findTeamFixture(fixtures, p.team);
      const result = deriveTeamResult(fixture, p.team);
      if (result === "pending" || result === "unplayed") pendingTeams.add(p.team);
    }
    if (pendingTeams.size > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `These picks don't have a final result yet, so results can't be applied: ${Array.from(pendingTeams).join(", ")}. Wait for the match(es) to finish, or fix the fixture manually.`,
        },
        { status: 400 }
      );
    }

    const { rows: alivePlayers } = await client.query(
      "SELECT id FROM participants WHERE scot_team_status != 'eliminated' AND can_play_scot_teams = true"
    );

    const submittedIds = new Set(picks.map((p) => p.participant_id));
    const eliminatedIds: number[] = [];

    for (const p of picks) {
      if (!winnerSet.has(String(p.team).toLowerCase())) eliminatedIds.push(p.participant_id);
    }
    for (const row of alivePlayers) {
      if (!submittedIds.has(row.id)) eliminatedIds.push(row.id);
    }

    if (eliminatedIds.length > 0) {
      await client.query(
        `UPDATE participants SET scot_team_status = 'eliminated', scot_team_eliminated_gw = $1 WHERE id = ANY($2::int[])`,
        [gs.current_gw, eliminatedIds]
      );
    }

    await client.query(
      `INSERT INTO scot_team_results (gw, winning_teams) VALUES ($1, $2)
       ON CONFLICT (gw) DO UPDATE SET winning_teams = EXCLUDED.winning_teams, applied_at = now()`,
      [gs.current_gw, JSON.stringify(winningTeamsDisplay)]
    );

    const { rows: stillAlive } = await client.query(
      "SELECT count(*)::int AS n FROM participants WHERE scot_team_status != 'eliminated' AND can_play_scot_teams = true"
    );

    let newPhase = "picking";
    let newGW = gs.current_gw;
    if (stillAlive[0].n <= 1) {
      newPhase = "finished";
    } else {
      newGW = gs.current_gw + 1;
    }

    await client.query("UPDATE scot_team_state SET phase = $1, current_gw = $2 WHERE id = 1", [
      newPhase,
      newGW,
    ]);

    await client.query("COMMIT");

    try {
      await sendPushToGamePlayers("can_play_scot_teams", {
        title: `🏴 Scottish Team Survival — GW${gs.current_gw} results are in`,
        body:
          eliminatedIds.length > 0
            ? `${eliminatedIds.length} eliminated this week. Check if you survived!`
            : "Everyone survived this week!",
        url: "/scottish/teams/standings",
      });
    } catch {
      // never let a notification failure mask a successful results apply
    }

    return NextResponse.json({ ok: true, phase: newPhase, currentGW: newGW, eliminated: eliminatedIds.length });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
});
