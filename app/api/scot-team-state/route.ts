import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { getCurrentParticipantId } from "@/lib/session";
import { computePickDeadline } from "@/lib/game";
import { deriveTeamResult, findTeamFixture } from "@/lib/teams";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();

  const { rows: gsRows } = await pool.query(
    "SELECT current_gw, phase, season FROM scot_team_state WHERE id = 1"
  );
  const gs = gsRows[0];

  const { rows: participants } = await pool.query(
    `SELECT id, name, scot_team_status AS status, scot_team_eliminated_gw AS "eliminatedGW",
            can_play_scot_players AS "canPlayPlayers", can_play_scot_teams AS "canPlayTeams"
     FROM participants ORDER BY created_at ASC`
  );

  const { rows: submittedRows } = await pool.query(
    "SELECT participant_id FROM scot_team_picks WHERE gw = $1",
    [gs.current_gw]
  );
  const submittedSet = new Set(submittedRows.map((r) => r.participant_id));

  const { rows: fixtures } = await pool.query(
    `SELECT home, away, kickoff, venue, status,
            home_score AS "homeScore", away_score AS "awayScore"
     FROM fixtures WHERE season = $1 AND gw = $2 ORDER BY kickoff ASC NULLS LAST`,
    [gs.season, gs.current_gw]
  );

  const availableTeams = Array.from(
    new Set(fixtures.flatMap((f) => [f.home, f.away]))
  ).sort();

  const participantId = await getCurrentParticipantId();
  let me = null;

  if (participantId) {
    const { rows: meRows } = await pool.query(
      `SELECT id, name, scot_team_status AS status, scot_team_eliminated_gw AS "eliminatedGW",
              can_play_scot_players AS "canPlayPlayers", can_play_scot_teams AS "canPlayTeams"
       FROM participants WHERE id = $1`,
      [participantId]
    );
    if (meRows[0]) {
      const { rows: pickRows } = await pool.query(
        `SELECT team FROM scot_team_picks WHERE gw = $1 AND participant_id = $2`,
        [gs.current_gw, participantId]
      );
      const { rows: usedRows } = await pool.query(
        `SELECT team FROM scot_team_picks WHERE participant_id = $1 AND gw != $2`,
        [participantId, gs.current_gw]
      );
      const usedTeams = Array.from(new Set(usedRows.map((r) => r.team.toLowerCase())));

      const { rows: historyRows } = await pool.query(
        `SELECT tp.gw, tp.team, tr.winning_teams AS "winningTeams"
         FROM scot_team_picks tp
         LEFT JOIN scot_team_results tr ON tr.gw = tp.gw
         WHERE tp.participant_id = $1 AND tp.gw < $2
         ORDER BY tp.gw ASC`,
        [participantId, gs.current_gw]
      );
      const { rows: historyFixtureRows } = await pool.query(
        `SELECT gw, home, away, status, home_score AS "homeScore", away_score AS "awayScore"
         FROM fixtures WHERE season = $1`,
        [gs.season]
      );
      const fixturesByGW = new Map<number, typeof historyFixtureRows>();
      for (const f of historyFixtureRows) {
        const list = fixturesByGW.get(f.gw) || [];
        list.push(f);
        fixturesByGW.set(f.gw, list);
      }

      const history = historyRows.map((r) => {
        const resolved = r.winningTeams !== null;
        const gwFixtures = fixturesByGW.get(r.gw) || [];
        const fixture = findTeamFixture(gwFixtures, r.team);
        return {
          gw: r.gw,
          team: r.team,
          result: resolved ? deriveTeamResult(fixture, r.team) : "pending",
        };
      });

      me = {
        ...meRows[0],
        pick: pickRows[0] || null,
        usedTeams,
        history,
      };
    }
  }

  const pickDeadline = computePickDeadline(fixtures.map((f) => f.kickoff));

  return NextResponse.json({
    gameState: {
      currentGW: gs.current_gw,
      phase: gs.phase,
      season: gs.season,
      pickDeadline,
    },
    participants: participants.map((p) => ({ ...p, submitted: submittedSet.has(p.id) })),
    fixtures,
    availableTeams,
    me,
  });
});
