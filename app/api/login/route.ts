import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { createParticipantSession } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  const { participantId, code } = await req.json().catch(() => ({ participantId: null, code: "" }));
  const id = Number(participantId);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Pick your name first." }, { status: 400 });
  }
  if (!code || typeof code !== "string" || code.length !== 4) {
    return NextResponse.json({ error: "Enter all 4 digits." }, { status: 400 });
  }
  const { rows } = await pool.query("SELECT id, name, code FROM participants WHERE id = $1", [id]);
  if (rows.length === 0 || rows[0].code !== code) {
    return NextResponse.json({ error: "That PIN doesn't match." }, { status: 404 });
  }
  await createParticipantSession(rows[0].id);
  return NextResponse.json({ ok: true, name: rows[0].name });
});
