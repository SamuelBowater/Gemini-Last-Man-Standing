import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { withErrors } from "@/lib/api-wrapper";

// TEMPORARY debug route — verifies whether football-data.org's match-details
// endpoint returns real substitution data on our current plan. Delete after use.
export const GET = withErrors(async () => {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key set." }, { status: 500 });

  // Grab a real finished match ID from a past, fully-completed matchday.
  const listResp = await fetch(
    "https://api.football-data.org/v4/competitions/PL/matches?matchday=1&season=2024",
    { headers: { "X-Auth-Token": apiKey } }
  );
  const listData = await listResp.json();
  if (!listResp.ok) return NextResponse.json({ step: "list", status: listResp.status, body: listData });

  const finished = listData.matches?.find((m: { status: string }) => m.status === "FINISHED");
  if (!finished) return NextResponse.json({ step: "list", note: "no finished match found", listData });

  const detailResp = await fetch(`https://api.football-data.org/v4/matches/${finished.id}`, {
    headers: { "X-Auth-Token": apiKey },
  });
  const detailData = await detailResp.json();

  return NextResponse.json({
    matchId: finished.id,
    home: finished.homeTeam?.name,
    away: finished.awayTeam?.name,
    detailStatus: detailResp.status,
    topLevelKeys: detailData ? Object.keys(detailData) : null,
    matchKeys: detailData?.match ? Object.keys(detailData.match) : null,
    fullBody: detailData,
  });
});
