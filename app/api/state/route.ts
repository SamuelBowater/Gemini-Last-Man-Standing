import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { officialFixturesUrl } from "@/lib/game";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();

  const { rows: gsRows } = await pool.query(
    "SELECT current_gw, phase, season FROM game_state WHERE id = 1"
  );
  const gs = gsRows[0];

  const { rows: participants } = await pool.query(
    `SELECT id, name, status, eliminated_gw AS "eliminatedGW" FROM participants ORDER BY created_at ASC`
  );

  const { rows: submittedRows } = await pool.query(
    "SELECT participant_id FROM picks WHERE gw = $1",
    [gs.current_gw]
  );
  const submittedSet = new Set(submittedRows.map((r) => r.participant_id));

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, kickoff, venue, status FROM fixtures WHERE season = $1 AND gw = $2 ORDER BY kickoff ASC NULLS LAST`,
    [gs.season, gs.current_gw]
  );

  const participantId = await getCurrentParticipantId();
  let me = null;

  if (participantId) {
    const { rows: meRows } = await pool.query(
      `SELECT id, name, status, eliminated_gw AS "eliminatedGW" FROM participants WHERE id = $1`,
      [participantId]
    );
    if (meRows[0]) {
      const { rows: pickRows } = await pool.query(
        `SELECT forward, midfielder, defender FROM picks WHERE gw = $1 AND participant_id = $2`,
        [gs.current_gw, participantId]
      );
      const { rows: usedRows } = await pool.query(
        `SELECT forward, midfielder, defender FROM picks WHERE participant_id = $1`,
        [participantId]
      );
      const usedPlayers = Array.from(
        new Set(usedRows.flatMap((r) => [r.forward, r.midfielder, r.defender]).map((n) => n.toLowerCase()))
      );
      me = {
        ...meRows[0],
        pick: pickRows[0] || null,
        usedPlayers,
      };
    }
  }

  return NextResponse.json({
    gameState: { currentGW: gs.current_gw, phase: gs.phase, season: gs.season },
    participants: participants.map((p) => ({ ...p, submitted: submittedSet.has(p.id) })),
    fixtures,
    officialFixturesUrl: officialFixturesUrl(gs.season, gs.current_gw),
    me,
  });
});
