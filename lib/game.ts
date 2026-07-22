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

/** Picks lock 1 hour before the gameweek's first kickoff. Returns null if no kickoff times are set yet. */
export function computePickDeadline(kickoffs: (string | null)[]): string | null {
  const known = kickoffs.filter((k): k is string => Boolean(k)).sort();
  if (known.length === 0) return null;
  return new Date(new Date(known[0]).getTime() - 60 * 60 * 1000).toISOString();
}
