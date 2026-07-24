import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { rows } = await pool.query(
    `SELECT season, signup_code AS "signupCode" FROM game_state WHERE id = 1`
  );
  return NextResponse.json(rows[0]);
});

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { season, signupCode } = await req.json().catch(() => ({}));

  if (season === undefined && signupCode === undefined) {
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

  return NextResponse.json({ ok: true });
});
