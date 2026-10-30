import { pool } from "@/lib/db";
import { computeLives, type LivesStatus } from "@/lib/lives";

export type EliminationGame = "players" | "teams";

export interface PreviousWinner {
  name: string;
  startGW: number;
  endGW: number;
}

export async function previousWinners(game: EliminationGame): Promise<PreviousWinner[]> {
  const { rows } = await pool.query(
    `SELECT p.name, w.gw AS "endGW",
            coalesce((SELECT max(start_gw) FROM game_eras e WHERE e.game = w.game AND e.start_gw <= w.gw), 1)::int AS "startGW"
     FROM game_winners w JOIN participants p ON p.id = w.participant_id
     WHERE w.game = $1
     ORDER BY w.gw DESC`,
    [game]
  );
  return rows;
}

/**
 * Who was eliminated, and when, as of `gw` within the game (era) that gameweek
 * belonged to. Rollovers and restarts reset participants' live status, so past
 * gameweeks are answered from the log instead.
 */
export async function eliminationsAsOf(game: EliminationGame, gw: number): Promise<Map<number, number>> {
  const { rows: eraRows } = await pool.query(
    "SELECT max(start_gw)::int AS start FROM game_eras WHERE game = $1 AND start_gw <= $2",
    [game, gw]
  );
  const eraStart: number = eraRows[0].start ?? 1;
  const { rows } = await pool.query(
    `SELECT participant_id, min(gw)::int AS gw
     FROM elimination_log
     WHERE game = $1 AND gw >= $2 AND gw <= $3
     GROUP BY participant_id`,
    [game, eraStart, gw]
  );
  return new Map(rows.map((r) => [r.participant_id as number, r.gw as number]));
}

/**
 * Lives as of `gw` within the era that gameweek belongs to. Every row in
 * elimination_log is a life lost; only players with at least one loss appear in
 * `lives` — everyone else is on full lives. `livesTotal` is the number of lives
 * that era actually had: eras starting before `livesFromGw` were single-life games.
 */
export async function livesAsOf(
  game: EliminationGame,
  gw: number,
  config: { livesTotal: number; livesFromGw: number }
): Promise<{ lives: Map<number, LivesStatus>; livesTotal: number }> {
  const { rows: eraRows } = await pool.query(
    "SELECT max(start_gw)::int AS start FROM game_eras WHERE game = $1 AND start_gw <= $2",
    [game, gw]
  );
  const eraStart: number = eraRows[0].start ?? 1;
  const livesTotal = eraStart >= config.livesFromGw ? config.livesTotal : 1;
  const { rows } = await pool.query(
    "SELECT participant_id, gw FROM elimination_log WHERE game = $1 AND gw >= $2 AND gw <= $3",
    [game, eraStart, gw]
  );
  const lossesByPlayer = new Map<number, number[]>();
  for (const r of rows) {
    const list = lossesByPlayer.get(r.participant_id) ?? [];
    list.push(r.gw);
    lossesByPlayer.set(r.participant_id, list);
  }
  const lives = new Map(
    Array.from(lossesByPlayer, ([id, losses]) => [id, computeLives(losses, livesTotal, gw)] as const)
  );
  return { lives, livesTotal };
}

export function livesFor(map: Map<number, LivesStatus>, id: number, livesTotal: number, gw: number): LivesStatus {
  return map.get(id) ?? computeLives([], livesTotal, gw);
}
