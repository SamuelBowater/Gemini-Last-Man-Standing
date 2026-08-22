import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

// Table/column names below are all literal values from this fixed whitelist,
// never user input, so building queries with them is safe.
const CONFIGS = {
  players: {
    stateTable: "game_state",
    resultsTable: "results",
    statusCol: "status",
    eliminatedGwCol: "eliminated_gw",
  },
  teams: {
    stateTable: "team_state",
    resultsTable: "team_results",
    statusCol: "team_status",
    eliminatedGwCol: "team_eliminated_gw",
  },
  "scot-players": {
    stateTable: "scot_game_state",
    resultsTable: "scot_results",
    statusCol: "scot_status",
    eliminatedGwCol: "scot_eliminated_gw",
  },
  "scot-teams": {
    stateTable: "scot_team_state",
    resultsTable: "scot_team_results",
    statusCol: "scot_team_status",
    eliminatedGwCol: "scot_team_eliminated_gw",
  },
} as const;

type GameKey = keyof typeof CONFIGS;

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { game } = await req.json().catch(() => ({ game: null }));
  const config = CONFIGS[game as GameKey];
  if (!config) return NextResponse.json({ error: "Unknown game." }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: gsRows } = await client.query(
      `SELECT current_gw, phase FROM ${config.stateTable} WHERE id = 1 FOR UPDATE`
    );
    const gs = gsRows[0];

    // The gameweek to undo is whichever one results were last applied for: if the
    // pool is still going, applying results already advanced current_gw, so it's
    // current_gw - 1; if the pool finished, results were applied for current_gw
    // itself and it never advanced.
    const targetGW = gs.phase === "finished" ? gs.current_gw : gs.current_gw - 1;

    const { rows: resultRows } = await client.query(
      `SELECT gw FROM ${config.resultsTable} WHERE gw = $1`,
      [targetGW]
    );
    if (targetGW < 1 || resultRows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "No applied results to undo." }, { status: 400 });
    }

    await client.query(
      `UPDATE participants SET ${config.statusCol} = 'alive', ${config.eliminatedGwCol} = NULL
       WHERE ${config.eliminatedGwCol} = $1`,
      [targetGW]
    );

    await client.query(`DELETE FROM ${config.resultsTable} WHERE gw = $1`, [targetGW]);

    await client.query(
      `UPDATE ${config.stateTable} SET phase = 'picking', current_gw = $1 WHERE id = 1`,
      [targetGW]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, restoredGW: targetGW });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
});
