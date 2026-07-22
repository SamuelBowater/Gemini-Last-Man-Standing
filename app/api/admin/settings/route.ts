import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { season, apiSeason } = await req.json().catch(() => ({}));

  const updates: string[] = [];
  const values: string[] = [];
  if (season) {
    values.push(season);
    updates.push(`season = $${values.length}`);
  }
  if (apiSeason) {
    values.push(apiSeason);
    updates.push(`api_season = $${values.length}`);
  }
  if (updates.length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  await pool.query(`UPDATE game_state SET ${updates.join(", ")} WHERE id = 1`, values);
  return NextResponse.json({ ok: true });
});
