import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { season } = await req.json().catch(() => ({}));

  if (!season) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  await pool.query("UPDATE game_state SET season = $1 WHERE id = 1", [season]);
  return NextResponse.json({ ok: true });
});
