import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { rows } = await pool.query(
    `SELECT season, signup_code AS "signupCode", locked, scottish_hidden AS "scottishHidden" FROM game_state WHERE id = 1`
  );
  return NextResponse.json(rows[0]);
});

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { season, signupCode, locked, scottishHidden } = await req.json().catch(() => ({}));

  if (season === undefined && signupCode === undefined && locked === undefined && scottishHidden === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  if (season !== undefined) {
    await pool.query("UPDATE game_state SET season = $1 WHERE id = 1", [season]);
  }

  if (signupCode !== undefined) {
    const trimmed = String(signupCode).trim();
    if (trimmed && !/^\d{6}$/.test(trimmed)) {
      return NextResponse.json({ error: "Signup code needs to be exactly 6 digits." }, { status: 400 });
    }
    await pool.query("UPDATE game_state SET signup_code = $1 WHERE id = 1", [trimmed || null]);
  }

  if (locked !== undefined) {
    if (typeof locked !== "boolean") {
      return NextResponse.json({ error: "locked must be a boolean." }, { status: 400 });
    }
    // One combined toggle locks both main-season games together.
    await pool.query("UPDATE game_state SET locked = $1 WHERE id = 1", [locked]);
    await pool.query("UPDATE team_state SET locked = $1 WHERE id = 1", [locked]);
  }

  if (scottishHidden !== undefined) {
    if (typeof scottishHidden !== "boolean") {
      return NextResponse.json({ error: "scottishHidden must be a boolean." }, { status: 400 });
    }
    await pool.query("UPDATE game_state SET scottish_hidden = $1 WHERE id = 1", [scottishHidden]);
  }

  return NextResponse.json({ ok: true });
});
