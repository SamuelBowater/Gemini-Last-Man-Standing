import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { createParticipantSession } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const pin = String(body.pin || "").trim();
  const inviteCode = String(body.inviteCode || "").trim();
  const canPlayPlayers = Boolean(body.canPlayPlayers);
  const canPlayTeams = Boolean(body.canPlayTeams);

  if (!name) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Your PIN needs to be exactly 4 digits." }, { status: 400 });
  }
  if (!canPlayPlayers && !canPlayTeams) {
    return NextResponse.json({ error: "Pick at least one pool to join." }, { status: 400 });
  }

  const { rows: gsRows } = await pool.query("SELECT signup_code AS \"signupCode\" FROM game_state WHERE id = 1");
  const requiredCode = gsRows[0]?.signupCode;
  if (!requiredCode || inviteCode !== requiredCode) {
    return NextResponse.json({ error: "That invite code isn't right." }, { status: 400 });
  }

  const { rows: nameRows } = await pool.query(
    "SELECT 1 FROM participants WHERE lower(name) = lower($1)",
    [name]
  );
  if (nameRows.length > 0) {
    return NextResponse.json({ error: "That name's already taken — try another." }, { status: 400 });
  }

  const { rows: pinRows } = await pool.query("SELECT 1 FROM participants WHERE code = $1", [pin]);
  if (pinRows.length > 0) {
    return NextResponse.json({ error: "That PIN's already taken — pick another." }, { status: 400 });
  }

  let rows;
  try {
    ({ rows } = await pool.query(
      `INSERT INTO participants (name, code, can_play_players, can_play_teams)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name`,
      [name, pin, canPlayPlayers, canPlayTeams]
    ));
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "That PIN's already taken — pick another." }, { status: 400 });
    }
    throw err;
  }

  await createParticipantSession(rows[0].id);
  return NextResponse.json({ ok: true, name: rows[0].name });
});
