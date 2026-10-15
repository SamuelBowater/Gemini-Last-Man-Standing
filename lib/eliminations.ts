import { pool } from "@/lib/db";

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
