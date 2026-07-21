import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export async function POST() {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  await pool.query("TRUNCATE picks, results, sessions, participants RESTART IDENTITY CASCADE");
  await pool.query("UPDATE game_state SET current_gw = 1, phase = 'picking' WHERE id = 1");

  return NextResponse.json({ ok: true });
}
