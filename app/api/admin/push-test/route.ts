import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { sendPushToParticipant } from "@/lib/push";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { participantId } = await req.json().catch(() => ({}));
  if (!participantId) {
    return NextResponse.json({ error: "Pick a subscribed player to test." }, { status: 400 });
  }

  const result = await sendPushToParticipant(Number(participantId), {
    title: "Test notification",
    body: "If you're seeing this, push notifications are working! ⚽",
  });

  return NextResponse.json({ ok: true, ...result });
});
