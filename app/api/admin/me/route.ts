import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  return NextResponse.json({ isAdmin: await isAdmin() });
});
