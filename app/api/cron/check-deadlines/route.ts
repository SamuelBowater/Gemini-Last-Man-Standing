import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { computePickDeadline } from "@/lib/game";
import { sendPushToGamePlayers } from "@/lib/push";
import { withErrors } from "@/lib/api-wrapper";

async function authorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return isAdmin();
}

interface GameConfig {
  stateTable: "game_state" | "team_state" | "scot_game_state" | "scot_team_state";
  hasLockColumn: boolean;
  canPlayColumn: "can_play_players" | "can_play_teams" | "can_play_scot_players" | "can_play_scot_teams";
  label: string;
  pickUrl: string;
}

// Table names below are always one of these hardcoded literals — never derived
// from request input — so interpolating them into the SQL is safe.
const GAMES: GameConfig[] = [
  { stateTable: "game_state", hasLockColumn: true, canPlayColumn: "can_play_players", label: "Player Picks", pickUrl: "/players" },
  { stateTable: "team_state", hasLockColumn: true, canPlayColumn: "can_play_teams", label: "Team Survival", pickUrl: "/teams" },
  { stateTable: "scot_game_state", hasLockColumn: false, canPlayColumn: "can_play_scot_players", label: "🏴 Scottish Player Picks", pickUrl: "/scottish/players" },
  { stateTable: "scot_team_state", hasLockColumn: false, canPlayColumn: "can_play_scot_teams", label: "🏴 Scottish Team Survival", pickUrl: "/scottish/teams" },
];

const ONE_HOUR_MS = 60 * 60 * 1000;

export const GET = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const actions: { game: string; gw: number; sent: "reminder" | "locked" }[] = [];

  for (const game of GAMES) {
    const lockedSelect = game.hasLockColumn ? ", locked" : "";
    const { rows } = await pool.query(
      `SELECT current_gw, season, phase, reminder_sent_gw, locked_notified_gw${lockedSelect} FROM ${game.stateTable} WHERE id = 1`
    );
    const gs = rows[0];
    if (!gs || gs.phase === "finished") continue;
    if (game.hasLockColumn && gs.locked) continue;

    const { rows: fixtureRows } = await pool.query(
      "SELECT kickoff FROM fixtures WHERE season = $1 AND gw = $2",
      [gs.season, gs.current_gw]
    );
    const deadline = computePickDeadline(fixtureRows.map((f) => f.kickoff));
    if (!deadline) continue;

    const deadlineMs = new Date(deadline).getTime();
    const now = Date.now();

    if (now >= deadlineMs && gs.locked_notified_gw !== gs.current_gw) {
      await sendPushToGamePlayers(game.canPlayColumn, {
        title: `${game.label} — GW${gs.current_gw} picks are locked`,
        body: "Kick-off's here — no more changes. Good luck!",
        url: game.pickUrl,
      });
      await pool.query(`UPDATE ${game.stateTable} SET locked_notified_gw = $1 WHERE id = 1`, [gs.current_gw]);
      actions.push({ game: game.label, gw: gs.current_gw, sent: "locked" });
    } else if (now >= deadlineMs - ONE_HOUR_MS && now < deadlineMs && gs.reminder_sent_gw !== gs.current_gw) {
      await sendPushToGamePlayers(game.canPlayColumn, {
        title: `${game.label} — GW${gs.current_gw} picks lock in under an hour`,
        body: "Get your picks in before kick-off!",
        url: game.pickUrl,
      });
      await pool.query(`UPDATE ${game.stateTable} SET reminder_sent_gw = $1 WHERE id = 1`, [gs.current_gw]);
      actions.push({ game: game.label, gw: gs.current_gw, sent: "reminder" });
    }
  }

  return NextResponse.json({ ok: true, actions });
});
