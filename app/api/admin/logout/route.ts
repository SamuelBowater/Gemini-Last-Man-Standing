import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async () => {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
});
