import crypto from "crypto";

export function generateCode(existing: Set<string>): string {
  let code: string;
  do {
    code = String(crypto.randomInt(1000, 10000));
  } while (existing.has(code));
  return code;
}

export function officialFixturesUrl(season: string, gw: number) {
  return `https://www.premierleague.com/en/matches/premier-league/${season}/matchweek-${gw}`;
}
