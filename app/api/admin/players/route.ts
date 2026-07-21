import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { generateCode } from "@/lib/game";

export async function GET() {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { rows } = await pool.query(
    `SELECT id, name, code, status, eliminated_gw AS "eliminatedGW" FROM participants ORDER BY created_at ASC`
  );
  return NextResponse.json({ participants: rows });
}

export async function POST(req: NextRequest) {
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
}

export async function DELETE(req: NextRequest) {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await pool.query("DELETE FROM participants WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
