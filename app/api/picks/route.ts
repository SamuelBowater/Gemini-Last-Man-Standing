import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";

export async function POST(req: NextRequest) {
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

  const { rows: gsRows } = await pool.query("SELECT current_gw, phase FROM game_state WHERE id = 1");
  const gs = gsRows[0];
  if (gs.phase !== "picking") {
    return NextResponse.json({ error: "Picks aren't open right now." }, { status: 400 });
  }

  const { rows: meRows } = await pool.query("SELECT status FROM participants WHERE id = $1", [participantId]);
  if (!meRows[0] || meRows[0].status === "eliminated") {
    return NextResponse.json({ error: "You're already out of the pool." }, { status: 400 });
  }

  const { rows: existing } = await pool.query(
    "SELECT id FROM picks WHERE gw = $1 AND participant_id = $2",
    [gs.current_gw, participantId]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: "You've already locked in picks for this gameweek." }, { status: 400 });
  }

  const { rows: usedRows } = await pool.query(
    "SELECT forward, midfielder, defender FROM picks WHERE participant_id = $1",
    [participantId]
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
    `INSERT INTO picks (gw, participant_id, forward, midfielder, defender) VALUES ($1, $2, $3, $4, $5)`,
    [gs.current_gw, participantId, forward, midfielder, defender]
  );

  return NextResponse.json({ ok: true });
}
