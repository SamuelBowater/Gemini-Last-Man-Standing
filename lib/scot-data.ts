import { pool } from "@/lib/db";

const THESPORTSDB_KEY = process.env.THESPORTSDB_API_KEY || "123";
const SCOT_SEASON = "spfl-2026-27";
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

/** Goal-scorer names for one finished match. `ok: false` means the call itself failed
 * (rate limit, network) — distinct from a successful call that just found no goals, e.g.
 * because TheSportsDB hasn't logged that event yet for this match. */
async function fetchMatchGoalScorers(externalId: string): Promise<{ ok: boolean; scorers: string[] }> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}/lookuptimeline.php?id=${externalId}`;
    const resp = await fetch(url);
    if (!resp.ok) return { ok: false, scorers: [] };
    const data: { timeline?: TSDBTimelineEntry[] } = await resp.json();
    if (!data.timeline) return { ok: true, scorers: [] };
    const scorers = data.timeline
      .filter((t) => t.strTimeline === "Goal" && !/own goal/i.test(t.strTimelineDetail || ""))
      .map((t) => t.strPlayer)
      .filter((name): name is string => Boolean(name));
    return { ok: true, scorers };
  } catch {
    return { ok: false, scorers: [] };
  }
}

export interface GoalScorerLookup {
  externalId: string;
  label: string;
}

export interface GameweekGoalScorersResult {
  scorers: string[];
  failedMatches: string[];
}

/** Scorer names across every finished fixture for a gameweek, fetched sequentially with a
 * 2s gap between calls to stay well within TheSportsDB's free-tier rate limit — retries once
 * (after a longer pause) on failure before giving up on a match, and reports which matches
 * (if any) it couldn't get data for so the admin knows to check them by hand. */
export async function fetchGameweekGoalScorers(matches: GoalScorerLookup[]): Promise<GameweekGoalScorersResult> {
  const names: string[] = [];
  const failedMatches: string[] = [];
  for (const match of matches) {
    let result = await fetchMatchGoalScorers(match.externalId);
    if (!result.ok) {
      await wait(3000);
      result = await fetchMatchGoalScorers(match.externalId);
    }
    if (result.ok) {
      names.push(...result.scorers);
    } else {
      failedMatches.push(match.label);
    }
    await wait(2000);
  }
  return { scorers: Array.from(new Set(names)).sort(), failedMatches };
}

/** Fetches and upserts the whole Scottish Premiership season's fixtures/scores.
 * Shared by the manual admin "sync now" button and the nightly cron job. */
export async function syncScotFixtures(): Promise<{ ok: boolean; fixturesSynced: number; message?: string }> {
  let fixtures;
  try {
    fixtures = await fetchScotFixtures();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach TheSportsDB.";
    return { ok: false, fixturesSynced: 0, message };
  }

  // One batched multi-row upsert instead of one round-trip per fixture.
  const values: unknown[] = [];
  const valueRows: string[] = [];
  for (const f of fixtures) {
    const base = values.length;
    valueRows.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, 'api', $${base + 10})`
    );
    values.push(
      SCOT_SEASON,
      f.gw,
      f.home,
      f.away,
      f.kickoff,
      f.venue,
      f.status,
      f.homeScore,
      f.awayScore,
      f.externalId
    );
  }

  if (valueRows.length > 0) {
    await pool.query(
      `INSERT INTO fixtures (season, gw, home, away, kickoff, venue, status, home_score, away_score, source, external_id)
       VALUES ${valueRows.join(", ")}
       ON CONFLICT (season, gw, home, away)
       DO UPDATE SET kickoff = EXCLUDED.kickoff, venue = EXCLUDED.venue, status = EXCLUDED.status,
         home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score, source = 'api',
         external_id = EXCLUDED.external_id`,
      values
    );
  }

  return { ok: true, fixturesSynced: valueRows.length };
}

