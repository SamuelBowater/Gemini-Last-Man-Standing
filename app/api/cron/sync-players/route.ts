import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { fetchFplPlayers } from "@/lib/players";
import { withErrors } from "@/lib/api-wrapper";

async function authorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return isAdmin();
}

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let players;
  try {
    players = await fetchFplPlayers();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach the FPL API.";
    await pool.query("UPDATE player_sync_meta SET last_error = $1 WHERE id = 1", [message]);
    return NextResponse.json({ ok: false, playersSynced: 0, message }, { status: 200 });
  }

  // One batched multi-row upsert instead of one round-trip per player — the
  // sequential version was taking 40+ seconds for the full ~500-player list,
  // long enough to trip an external scheduler's request timeout.
  const values: unknown[] = [];
  const valueRows: string[] = [];
  for (const p of players) {
    const base = values.length;
    valueRows.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, now())`);
    values.push(p.fplId, p.name, p.team, p.position, p.status, p.news, p.chanceOfPlaying, p.threat);
  }

  if (valueRows.length > 0) {
    await pool.query(
      `INSERT INTO players (fpl_id, name, team, position, status, news, chance_of_playing, threat, updated_at)
       VALUES ${valueRows.join(", ")}
       ON CONFLICT (fpl_id)
       DO UPDATE SET name = EXCLUDED.name, team = EXCLUDED.team, position = EXCLUDED.position,
         status = EXCLUDED.status, news = EXCLUDED.news, chance_of_playing = EXCLUDED.chance_of_playing,
         threat = EXCLUDED.threat, updated_at = now()`,
      values
    );
  }

  // FPL drops players entirely from the feed once their club is relegated (rather than
  // reassigning them), so without this, players from last season's relegated clubs would
  // sit in our table forever — still selectable, under a team that's no longer in the league.
  // Guarded on a non-empty fetch so a fluke empty response can't wipe the whole table.
  let removed = 0;
  if (players.length > 0) {
    const res = await pool.query("DELETE FROM players WHERE fpl_id != ALL($1::int[])", [
      players.map((p) => p.fplId),
    ]);
    removed = res.rowCount ?? 0;
  }

  await pool.query("UPDATE player_sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
  return NextResponse.json({ ok: true, playersSynced: valueRows.length, playersRemoved: removed });
});
