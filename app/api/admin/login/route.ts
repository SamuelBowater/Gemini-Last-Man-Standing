import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSCODE isn't set in the environment yet." },
      { status: 500 }
    );
  }
  if (passcode !== expected) {
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
