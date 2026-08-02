import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { sendPushToAll } from "@/lib/push";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { title, body } = await req.json().catch(() => ({}));
  const trimmedTitle = String(title || "").trim();
  const trimmedBody = String(body || "").trim();
  if (!trimmedTitle || !trimmedBody) {
    return NextResponse.json({ error: "Enter both a title and a message." }, { status: 400 });
  }

  const result = await sendPushToAll({ title: trimmedTitle, body: trimmedBody });

  return NextResponse.json({ ok: true, ...result });
});
