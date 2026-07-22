import { NextRequest, NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const POST = withErrors(async (req: NextRequest) => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { scorers } = await req.json().catch(() => ({ scorers: [] }));
  const scorerSet = new Set((scorers as string[]).map((s) => s.toLowerCase().trim()));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: gsRows } = await client.query(
      "SELECT current_gw, phase FROM game_state WHERE id = 1 FOR UPDATE"
    );
    const gs = gsRows[0];
    if (gs.phase !== "picking") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This gameweek has already been resolved." }, { status: 400 });
    }

    const { rows: picks } = await client.query(
      "SELECT participant_id, forward, midfielder, defender FROM picks WHERE gw = $1",
      [gs.current_gw]
    );
    const { rows: alivePlayers } = await client.query(
      "SELECT id FROM participants WHERE status != 'eliminated'"
    );

    const submittedIds = new Set(picks.map((p) => p.participant_id));
    const eliminatedIds: number[] = [];

    for (const p of picks) {
      const hit =
        scorerSet.has(String(p.forward).toLowerCase()) ||
        scorerSet.has(String(p.midfielder).toLowerCase()) ||
        scorerSet.has(String(p.defender).toLowerCase());
      if (!hit) eliminatedIds.push(p.participant_id);
    }
    for (const row of alivePlayers) {
      if (!submittedIds.has(row.id)) eliminatedIds.push(row.id);
    }

    if (eliminatedIds.length > 0) {
      await client.query(
        `UPDATE participants SET status = 'eliminated', eliminated_gw = $1 WHERE id = ANY($2::int[])`,
        [gs.current_gw, eliminatedIds]
      );
    }

    await client.query(
      `INSERT INTO results (gw, scorers) VALUES ($1, $2)
       ON CONFLICT (gw) DO UPDATE SET scorers = EXCLUDED.scorers, applied_at = now()`,
      [gs.current_gw, JSON.stringify(Array.from(scorerSet))]
    );

    const { rows: stillAlive } = await client.query(
      "SELECT count(*)::int AS n FROM participants WHERE status != 'eliminated'"
    );

    let newPhase = "picking";
    let newGW = gs.current_gw;
    if (stillAlive[0].n <= 1) {
      newPhase = "finished";
    } else {
      newGW = gs.current_gw + 1;
    }

    await client.query("UPDATE game_state SET phase = $1, current_gw = $2 WHERE id = 1", [
      newPhase,
      newGW,
    ]);

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, phase: newPhase, currentGW: newGW, eliminated: eliminatedIds.length });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
});
