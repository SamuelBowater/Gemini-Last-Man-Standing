import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();

  const { rows } = await pool.query(
    `SELECT name, team, position, status, news,
            chance_of_playing AS "chanceOfPlaying", threat
     FROM players
     ORDER BY threat DESC`
  );

  return NextResponse.json({ players: rows });
});
