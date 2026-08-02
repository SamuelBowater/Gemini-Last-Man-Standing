import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { endpoint, p256dh, auth } = await req.json().catch(() => ({}));
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Malformed subscription." }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO push_subscriptions (participant_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET participant_id = EXCLUDED.participant_id,
       p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [participantId, endpoint, p256dh, auth]
  );

  return NextResponse.json({ ok: true });
});
