import webpush from "web-push";
import { pool } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Push notifications aren't configured — set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT."
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToSubscription(sub: SubscriptionRow, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    // 404/410 means the browser revoked this subscription — prune it.
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
    }
    return false;
  }
}

export async function sendPushToParticipant(participantId: number, payload: PushPayload) {
  ensureConfigured();
  const { rows } = await pool.query<SubscriptionRow>(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE participant_id = $1",
    [participantId]
  );
  let sent = 0;
  for (const sub of rows) {
    if (await sendToSubscription(sub, payload)) sent++;
  }
  return { attempted: rows.length, sent };
}

export async function sendPushToAll(payload: PushPayload) {
  ensureConfigured();
  const { rows } = await pool.query<SubscriptionRow>(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions"
  );
  let sent = 0;
  for (const sub of rows) {
    if (await sendToSubscription(sub, payload)) sent++;
  }
  return { attempted: rows.length, sent };
}
