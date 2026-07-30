import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();

  const { rows } = await pool.query(
    `SELECT name, team, position FROM scot_players ORDER BY name ASC`
  );

  const players = rows.map((r) => ({
    ...r,
    status: "available" as const,
    news: "",
    chanceOfPlaying: null,
    threat: 0,
  }));

  return NextResponse.json({ players });
});
