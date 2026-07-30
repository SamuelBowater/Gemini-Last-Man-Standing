import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { fetchAllScotSquads } from "@/lib/scot-data";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  let players;
  try {
    players = await fetchAllScotSquads();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach TheSportsDB.";
    await pool.query("UPDATE scot_player_sync_meta SET last_error = $1 WHERE id = 1", [message]);
    return NextResponse.json({ ok: false, playersSynced: 0, message });
  }

  for (const p of players) {
    await pool.query(
      `INSERT INTO scot_players (name, team, position, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (name, team) DO UPDATE SET position = EXCLUDED.position, updated_at = now()`,
      [p.name, p.team, p.position]
    );
  }

  await pool.query("UPDATE scot_player_sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
  return NextResponse.json({ ok: true, playersSynced: players.length });
});
