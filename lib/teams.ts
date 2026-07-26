export type TeamResult = "win" | "draw" | "loss" | "pending" | "unplayed";

export interface FixtureLike {
  home: string;
  away: string;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

/** Derives the outcome for a picked `team` from the fixture it played in that gameweek. */
export function deriveTeamResult(fixture: FixtureLike | undefined, team: string): TeamResult {
  if (!fixture) return "unplayed";
  if (!FINISHED_STATUSES.has(fixture.status || "")) return "pending";
  if (fixture.homeScore === null || fixture.awayScore === null) return "pending";

  const isHome = fixture.home === team;
  const myScore = isHome ? fixture.homeScore : fixture.awayScore;
  const oppScore = isHome ? fixture.awayScore : fixture.homeScore;

  if (myScore > oppScore) return "win";
  if (myScore === oppScore) return "draw";
  return "loss";
}

/** Finds the fixture a given team played in a list of fixtures for one gameweek. */
export function findTeamFixture<T extends FixtureLike>(fixtures: T[], team: string): T | undefined {
  return fixtures.find((f) => f.home === team || f.away === team);
}

/** Every team that actually won its fixture, out of a list of fixtures for one gameweek. */
export function computeWinningTeams(fixtures: FixtureLike[]): string[] {
  const winners: string[] = [];
  for (const f of fixtures) {
    if (!FINISHED_STATUSES.has(f.status || "")) continue;
    if (f.homeScore === null || f.awayScore === null) continue;
    if (f.homeScore > f.awayScore) winners.push(f.home);
    else if (f.awayScore > f.homeScore) winners.push(f.away);
  }
  return winners;
}
