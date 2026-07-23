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
  const forward = String(body.forward || "").trim();
  const midfielder = String(body.midfielder || "").trim();
  const defender = String(body.defender || "").trim();
  if (!forward || !midfielder || !defender) {
    return NextResponse.json({ error: "Pick a player for all three positions." }, { status: 400 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw, phase, season FROM game_state WHERE id = 1");
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

  const { rows: meRows } = await pool.query("SELECT status FROM participants WHERE id = $1", [participantId]);
  if (!meRows[0] || meRows[0].status === "eliminated") {
    return NextResponse.json({ error: "You're already out of the pool." }, { status: 400 });
  }

  const { rows: usedRows } = await pool.query(
    "SELECT forward, midfielder, defender FROM picks WHERE participant_id = $1 AND gw != $2",
    [participantId, gs.current_gw]
  );
  const used = new Set(
    usedRows.flatMap((r) => [r.forward, r.midfielder, r.defender]).map((n) => n.toLowerCase())
  );
  const chosen = [forward, midfielder, defender];
  const clash = chosen.find((n) => used.has(n.toLowerCase()));
  if (clash) {
    return NextResponse.json(
      { error: `You've already picked ${clash} in an earlier gameweek. Choose someone new.` },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO picks (gw, participant_id, forward, midfielder, defender)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (gw, participant_id)
     DO UPDATE SET forward = EXCLUDED.forward, midfielder = EXCLUDED.midfielder,
       defender = EXCLUDED.defender, submitted_at = now()`,
    [gs.current_gw, participantId, forward, midfielder, defender]
  );

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrors(async () => {
  await ensureSchema();
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { rows: gsRows } = await pool.query("SELECT current_gw, phase, season FROM game_state WHERE id = 1");
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

  await pool.query("DELETE FROM picks WHERE gw = $1 AND participant_id = $2", [gs.current_gw, participantId]);

  return NextResponse.json({ ok: true });
});
