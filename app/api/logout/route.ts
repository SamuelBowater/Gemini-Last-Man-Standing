import { NextResponse } from "next/server";
import { destroyParticipantSession } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async () => {
  await destroyParticipantSession();
  return NextResponse.json({ ok: true });
});
