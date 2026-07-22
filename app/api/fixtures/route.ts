import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { officialFixturesUrl } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();

  const { rows: gsRows } = await pool.query(
    "SELECT current_gw, season FROM game_state WHERE id = 1"
  );
  const gs = gsRows[0];

  const gw = Number(req.nextUrl.searchParams.get("gw")) || gs.current_gw;

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, kickoff, venue, status FROM fixtures WHERE season = $1 AND gw = $2 ORDER BY kickoff ASC NULLS LAST`,
    [gs.season, gw]
  );

  return NextResponse.json({
    fixtures,
    gw,
    currentGW: gs.current_gw,
    officialFixturesUrl: officialFixturesUrl(gs.season, gw),
  });
});
