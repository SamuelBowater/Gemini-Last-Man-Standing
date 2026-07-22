import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

/**
 * Hits API-Football's own /status endpoint, which reports your account's
 * plan, subscription, and daily request quota — independent of any
 * league/season params, so it tells us definitively whether the key and
 * plan are working at all.
 */
export const GET = withErrors(async () => {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY isn't set." }, { status: 500 });
  }

  const resp = await fetch("https://v3.football.api-sports.io/status", {
    headers: { "x-apisports-key": apiKey },
  });
  const text = await resp.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 1000) };
  }

  return NextResponse.json({ httpStatus: resp.status, body: data });
});
