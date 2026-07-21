import crypto from "crypto";

export function generateCode(existing: Set<string>): string {
  let code: string;
  do {
    code = String(crypto.randomInt(1000, 10000));
  } while (existing.has(code));
  return code;
}

export function extractRoundNumber(roundLabel: string | null | undefined): number | null {
  if (!roundLabel) return null;
  const match = /(\d+)\s*$/.exec(roundLabel);
  return match ? parseInt(match[1], 10) : null;
}

export function officialFixturesUrl(season: string, gw: number) {
  return `https://www.premierleague.com/en/matches/premier-league/${season}/matchweek-${gw}`;
}
