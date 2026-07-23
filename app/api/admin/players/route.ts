import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { generateCode } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { rows } = await pool.query(
    `SELECT id, name, code, status, eliminated_gw AS "eliminatedGW",
            can_play_players AS "canPlayPlayers", can_play_teams AS "canPlayTeams"
     FROM participants ORDER BY created_at ASC`
  );
  return NextResponse.json({ participants: rows });
});

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { name } = await req.json().catch(() => ({ name: "" }));
  const trimmed = String(name || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Enter a name." }, { status: 400 });

  const { rows: existingRows } = await pool.query(
    "SELECT 1 FROM participants WHERE lower(name) = lower($1)",
    [trimmed]
  );
  if (existingRows.length > 0) {
    return NextResponse.json({ error: "That name's already in the pool." }, { status: 400 });
  }

  const { rows: codeRows } = await pool.query("SELECT code FROM participants");
  const code = generateCode(new Set(codeRows.map((r) => r.code)));

  const { rows } = await pool.query(
    "INSERT INTO participants (name, code) VALUES ($1, $2) RETURNING id, name, code, status",
    [trimmed, code]
  );
  return NextResponse.json({ participant: rows[0] });
});

export const PATCH = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id, canPlayPlayers, canPlayTeams } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  if (typeof canPlayPlayers !== "boolean" || typeof canPlayTeams !== "boolean") {
    return NextResponse.json({ error: "canPlayPlayers and canPlayTeams must be booleans." }, { status: 400 });
  }
  await pool.query(
    "UPDATE participants SET can_play_players = $1, can_play_teams = $2 WHERE id = $3",
    [canPlayPlayers, canPlayTeams, id]
  );
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await pool.query("DELETE FROM participants WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
});
