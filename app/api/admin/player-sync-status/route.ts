import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { rows } = await pool.query(
    "SELECT last_synced_at AS \"lastSyncedAt\", last_error AS \"lastError\" FROM player_sync_meta WHERE id = 1"
  );
  return NextResponse.json(rows[0] || { lastSyncedAt: null, lastError: null });
});
