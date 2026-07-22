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

  for (const p of players) {
    await pool.query(
      `INSERT INTO players (fpl_id, name, team, position, status, news, chance_of_playing, threat, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (fpl_id)
       DO UPDATE SET name = EXCLUDED.name, team = EXCLUDED.team, position = EXCLUDED.position,
         status = EXCLUDED.status, news = EXCLUDED.news, chance_of_playing = EXCLUDED.chance_of_playing,
         threat = EXCLUDED.threat, updated_at = now()`,
      [p.fplId, p.name, p.team, p.position, p.status, p.news, p.chanceOfPlaying, p.threat]
    );
  }

  await pool.query("UPDATE player_sync_meta SET last_synced_at = now(), last_error = NULL WHERE id = 1");
  return NextResponse.json({ ok: true, playersSynced: players.length });
});
