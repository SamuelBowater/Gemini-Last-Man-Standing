const THESPORTSDB_KEY = process.env.THESPORTSDB_API_KEY || "123";
const SCOT_LEAGUE_ID = "4330";
const SCOT_SEASON_LABEL = "2026-2027";

interface TSDBEvent {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intRound: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strTimestamp: string | null;
  strVenue: string | null;
  strStatus: string | null;
}

export interface ScotFixture {
  externalId: string;
  gw: number;
  home: string;
  away: string;
  kickoff: string | null;
  venue: string | null;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

/** Normalizes TheSportsDB's status vocabulary into the same one football-data.org uses,
 * so every existing display helper and lib/teams.ts work unchanged for Scottish fixtures. */
function normalizeStatus(raw: string | null): string | null {
  switch (raw) {
    case "FT":
    case "AET":
    case "PEN":
      return "FINISHED";
    case "1H":
    case "2H":
    case "ET":
      return "IN_PLAY";
    case "HT":
      return "PAUSED";
    case "PST":
      return "POSTPONED";
    case "CANC":
    case "ABD":
      return "CANCELLED";
    default:
      return null;
  }
}

export async function fetchScotFixtures(): Promise<ScotFixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}/eventsseason.php?id=${SCOT_LEAGUE_ID}&s=${SCOT_SEASON_LABEL}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`TheSportsDB responded HTTP ${resp.status}.`);
  }
  const data: { events?: TSDBEvent[] } = await resp.json();
  if (!data.events) return [];

  return data.events
    .filter((e) => e.intRound && e.strHomeTeam && e.strAwayTeam)
    .map((e) => ({
      externalId: e.idEvent,
      gw: Number(e.intRound),
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      kickoff: e.strTimestamp ? `${e.strTimestamp}Z` : null,
      venue: e.strVenue || null,
      status: normalizeStatus(e.strStatus),
      homeScore: e.intHomeScore !== null && e.intHomeScore !== undefined ? Number(e.intHomeScore) : null,
      awayScore: e.intAwayScore !== null && e.intAwayScore !== undefined ? Number(e.intAwayScore) : null,
    }));
}

interface TSDBTimelineEntry {
  strTimeline: string;
  strTimelineDetail: string | null;
  strPlayer: string | null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Goal-scorer names for one finished match. Swallows failures — a match whose timeline
 * can't be fetched (rate limit, no data) just falls back to manual entry. */
export async function fetchMatchGoalScorers(externalId: string): Promise<string[]> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}/lookuptimeline.php?id=${externalId}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data: { timeline?: TSDBTimelineEntry[] } = await resp.json();
    if (!data.timeline) return [];
    return data.timeline
      .filter((t) => t.strTimeline === "Goal" && !/own goal/i.test(t.strTimelineDetail || ""))
      .map((t) => t.strPlayer)
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

/** Scorer names across every finished fixture for a gameweek, fetched sequentially with a
 * short delay between calls to stay within TheSportsDB's free-tier rate limit. */
export async function fetchGameweekGoalScorers(externalIds: string[]): Promise<string[]> {
  const names: string[] = [];
  for (const id of externalIds) {
    names.push(...(await fetchMatchGoalScorers(id)));
    await wait(300);
  }
  return Array.from(new Set(names)).sort();
}

