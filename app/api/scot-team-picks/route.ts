import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { computePickDeadline } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const team = String(body.team || "").trim();
  if (!team) {
    return NextResponse.json({ error: "Pick a team." }, { status: 400 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw, phase, season FROM scot_team_state WHERE id = 1");
  const gs = gsRows[0];
  if (gs.phase !== "picking") {
    return NextResponse.json({ error: "Picks aren't open right now." }, { status: 400 });
  }

  const { rows: fixtureRows } = await pool.query(
    "SELECT home, away, kickoff FROM fixtures WHERE season = $1 AND gw = $2",
    [gs.season, gs.current_gw]
  );
  const deadline = computePickDeadline(fixtureRows.map((f) => f.kickoff));
  if (deadline && Date.now() >= new Date(deadline).getTime()) {
    return NextResponse.json(
      { error: "Picks have locked for this gameweek — kickoff is under an hour away." },
      { status: 400 }
    );
  }

  const isFixturedThisGW = fixtureRows.some((f) => f.home === team || f.away === team);
  if (!isFixturedThisGW) {
    return NextResponse.json({ error: "That team isn't playing this gameweek." }, { status: 400 });
  }

  const { rows: meRows } = await pool.query("SELECT scot_team_status FROM participants WHERE id = $1", [participantId]);
  if (!meRows[0] || meRows[0].scot_team_status === "eliminated") {
    return NextResponse.json({ error: "You're already out of the pool." }, { status: 400 });
  }

  const { rows: usedRows } = await pool.query(
    "SELECT team FROM scot_team_picks WHERE participant_id = $1 AND gw != $2",
    [participantId, gs.current_gw]
  );
  const used = new Set(usedRows.map((r) => r.team.toLowerCase()));
  if (used.has(team.toLowerCase())) {
    return NextResponse.json(
      { error: `You've already picked ${team} in an earlier gameweek. Choose someone new.` },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO scot_team_picks (gw, participant_id, team)
     VALUES ($1, $2, $3)
     ON CONFLICT (gw, participant_id)
     DO UPDATE SET team = EXCLUDED.team, submitted_at = now()`,
    [gs.current_gw, participantId, team]
  );

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrors(async () => {
  await ensureSchema();
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw, phase, season FROM scot_team_state WHERE id = 1");
  const gs = gsRows[0];
  if (gs.phase !== "picking") {
    return NextResponse.json({ error: "Picks aren't open right now." }, { status: 400 });
  }

  const { rows: fixtureRows } = await pool.query(
    "SELECT kickoff FROM fixtures WHERE season = $1 AND gw = $2",
    [gs.season, gs.current_gw]
  );
  const deadline = computePickDeadline(fixtureRows.map((f) => f.kickoff));
  if (deadline && Date.now() >= new Date(deadline).getTime()) {
    return NextResponse.json(
      { error: "Picks have locked for this gameweek — kickoff is under an hour away." },
      { status: 400 }
    );
  }

  await pool.query("DELETE FROM scot_team_picks WHERE gw = $1 AND participant_id = $2", [gs.current_gw, participantId]);

  return NextResponse.json({ ok: true });
});
