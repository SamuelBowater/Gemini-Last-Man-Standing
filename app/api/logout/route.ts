import { NextResponse } from "next/server";
import { destroyParticipantSession } from "@/lib/session";

export async function POST() {
  await destroyParticipantSession();
  return NextResponse.json({ ok: true });
}
