import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query("SELECT current_gw, phase FROM team_state WHERE id = 1 FOR UPDATE");
    const gs = rows[0];
    if (gs.phase !== "finished") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "The current game hasn't finished yet." }, { status: 400 });
    }

    // A finished pool never advances current_gw past the gameweek it ended on,
    // so the new game starts on the next one.
    const startGW = gs.current_gw + 1;

    await client.query(
      "UPDATE participants SET team_status = 'alive', team_eliminated_gw = NULL WHERE can_play_teams = true"
    );
    await client.query(
      "UPDATE team_state SET phase = 'picking', current_gw = $1, reset_from_gw = $1 WHERE id = 1",
      [startGW]
    );
    await client.query("INSERT INTO game_eras (game, start_gw) VALUES ('teams', $1) ON CONFLICT DO NOTHING", [
      startGW,
    ]);

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, currentGW: startGW });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
});
