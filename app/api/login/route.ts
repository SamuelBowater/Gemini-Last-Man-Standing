import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { createParticipantSession } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  const { code } = await req.json().catch(() => ({ code: "" }));
  if (!code || typeof code !== "string" || code.length !== 4) {
    return NextResponse.json({ error: "Enter all 4 digits." }, { status: 400 });
  }
  const { rows } = await pool.query("SELECT id, name FROM participants WHERE code = $1", [code]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "That code doesn't match anyone in the pool." }, { status: 404 });
  }
  await createParticipantSession(rows[0].id);
  return NextResponse.json({ ok: true, name: rows[0].name });
});
