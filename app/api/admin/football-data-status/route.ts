import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";
import { FD_COMPETITION_CODE } from "@/lib/data";

/**
 * Hits football-data.org's competition endpoint, which — beyond confirming
 * the key/connection works at all — tells us exactly which season the API
 * currently considers "current" for the Premier League (currentSeason
 * .startDate/.endDate), which is the thing that determines what /matches
 * returns on the free plan.
 */
export const GET = withErrors(async () => {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY isn't set." }, { status: 500 });
  }

  const resp = await fetch(`https://api.football-data.org/v4/competitions/${FD_COMPETITION_CODE}`, {
    headers: { "X-Auth-Token": apiKey },
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
