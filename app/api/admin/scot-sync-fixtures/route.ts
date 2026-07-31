import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { syncScotFixtures } from "@/lib/scot-data";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const result = await syncScotFixtures();
  return NextResponse.json(result);
});
