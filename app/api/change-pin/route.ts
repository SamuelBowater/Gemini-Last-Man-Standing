import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPin = String(body.currentPin || "").trim();
  const newPin = String(body.newPin || "").trim();

  if (!/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ error: "Your new PIN needs to be exactly 4 digits." }, { status: 400 });
  }

  const { rows } = await pool.query("SELECT code FROM participants WHERE id = $1", [participantId]);
  if (rows.length === 0 || rows[0].code !== currentPin) {
    return NextResponse.json({ error: "That's not your current PIN." }, { status: 400 });
  }

  try {
    await pool.query("UPDATE participants SET code = $1 WHERE id = $2", [newPin, participantId]);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "That PIN's already taken — pick another." }, { status: 400 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
});
