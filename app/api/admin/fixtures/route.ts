import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM game_state WHERE id = 1");
  const gs = gsRows[0];
  const { rows } = await pool.query(
    `SELECT id, home, away, kickoff, venue, status, source FROM fixtures WHERE season = $1 AND gw = $2 ORDER BY kickoff ASC NULLS LAST`,
    [gs.season, gs.current_gw]
  );
  return NextResponse.json({ fixtures: rows, currentGW: gs.current_gw, season: gs.season });
});

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { home, away, kickoff } = await req.json().catch(() => ({}));
  if (!home || !away) return NextResponse.json({ error: "Enter both teams." }, { status: 400 });

  const { rows: gsRows } = await pool.query("SELECT current_gw, season FROM game_state WHERE id = 1");
  const gs = gsRows[0];

  await pool.query(
    `INSERT INTO fixtures (season, gw, home, away, kickoff, source)
     VALUES ($1, $2, $3, $4, $5, 'manual')
     ON CONFLICT (season, gw, home, away) DO UPDATE SET kickoff = EXCLUDED.kickoff`,
    [gs.season, gs.current_gw, String(home).trim(), String(away).trim(), kickoff || null]
  );

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await pool.query("DELETE FROM fixtures WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
});
