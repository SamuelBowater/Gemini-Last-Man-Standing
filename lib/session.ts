import { cookies } from "next/headers";
import crypto from "crypto";
import { pool, ensureSchema } from "./db";

const PARTICIPANT_COOKIE = "lms_session";
const ADMIN_COOKIE = "lms_admin";

const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me";

function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

/* ---------------- participant sessions (DB-backed, revocable) ---------------- */

export async function createParticipantSession(participantId: number) {
  await ensureSchema();
  const token = crypto.randomBytes(24).toString("hex");
  await pool.query("INSERT INTO sessions (token, participant_id) VALUES ($1, $2)", [
    token,
    participantId,
  ]);
  const jar = await cookies();
  jar.set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getCurrentParticipantId(): Promise<number | null> {
  const jar = await cookies();
  const token = jar.get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const { rows } = await pool.query("SELECT participant_id FROM sessions WHERE token = $1", [token]);
  return rows[0]?.participant_id ?? null;
}

export async function destroyParticipantSession() {
  const jar = await cookies();
  const token = jar.get(PARTICIPANT_COOKIE)?.value;
  if (token) {
    await ensureSchema();
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
  }
  jar.delete(PARTICIPANT_COOKIE);
}

/* ---------------- admin session (stateless signed cookie) ---------------- */

export async function createAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const val = jar.get(ADMIN_COOKIE)?.value;
  return !!val && val === sign("admin");
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}
