import { NextResponse } from "next/server";
import { SCOT_SQUADS } from "@/lib/scotSquads";
import { withErrors } from "@/lib/api-wrapper";

export const GET = withErrors(async () => {
  const players = SCOT_SQUADS.map((p) => ({
    ...p,
    status: "available" as const,
    news: "",
    chanceOfPlaying: null,
    threat: 0,
  }));

  return NextResponse.json({ players });
});
