import { NextResponse } from "next/server";
import { pool, ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  await ensureSchema();
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT DISTINCT p.id, p.name
     FROM participants p
     JOIN push_subscriptions ps ON ps.participant_id = p.id
     ORDER BY p.name ASC`
  );

  return NextResponse.json({ subscribers: rows });
});
