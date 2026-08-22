import type { PositionKey } from "@/lib/data";

export type PlayerStatus = "available" | "doubtful" | "injured" | "suspended" | "unavailable";

export const STATUS_LABEL: Record<PlayerStatus, string> = {
  available: "Available",
  doubtful: "Doubtful",
  injured: "Injured",
  suspended: "Suspended",
  unavailable: "Unavailable",
};

const ELEMENT_TYPE_TO_POSITION: Record<number, PositionKey | undefined> = {
  2: "defender",
  3: "midfielder",
  4: "forward",
};

const FPL_STATUS_TO_STATUS: Record<string, PlayerStatus> = {
  a: "available",
  d: "doubtful",
  i: "injured",
  s: "suspended",
  u: "unavailable",
};

// FPL's club names -> the canonical names used elsewhere in this app (lib/data.ts TEAMS).
const FPL_TEAM_NAME_TO_CANONICAL: Record<string, string> = {
  "Man City": "Manchester City",
  "Man Utd": "Manchester United",
  Newcastle: "Newcastle United",
  "Nott'm Forest": "Nottingham Forest",
  Spurs: "Tottenham Hotspur",
  "West Ham": "West Ham United",
  Leeds: "Leeds United",
  Bournemouth: "AFC Bournemouth",
};

/** Strips football-data.org's "FC"/"AFC" suffix so fixture team names line up with our canonical TEAMS list. */
export function normalizeTeamName(raw: string): string {
  return raw.replace(/\s+(FC|AFC)$/i, "").trim();
}

interface FplBootstrap {
  teams: { id: number; name: string }[];
  elements: {
    id: number;
    first_name: string;
    second_name: string;
    web_name: string;
    team: number;
    element_type: number;
    status: string;
    news: string;
    chance_of_playing_this_round: number | null;
    threat: string;
  }[];
}

export interface SyncedPlayer {
  fplId: number;
  name: string;
  team: string;
  position: PositionKey;
  status: PlayerStatus;
  news: string;
  chanceOfPlaying: number | null;
  threat: number;
}

export async function fetchFplPlayers(): Promise<SyncedPlayer[]> {
  const resp = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!resp.ok) throw new Error(`FPL API responded HTTP ${resp.status}`);
  const data: FplBootstrap = await resp.json();

  const teamNameById = new Map(
    data.teams.map((t) => [t.id, FPL_TEAM_NAME_TO_CANONICAL[t.name] || t.name])
  );

  const players: SyncedPlayer[] = [];
  for (const el of data.elements) {
    const position = ELEMENT_TYPE_TO_POSITION[el.element_type];
    if (!position) continue; // goalkeepers aren't picked in this pool
    const team = teamNameById.get(el.team);
    if (!team) continue;

    players.push({
      fplId: el.id,
      name: `${el.first_name} ${el.second_name}`.trim() || el.web_name,
      team,
      position,
      status: FPL_STATUS_TO_STATUS[el.status] || "available",
      news: el.news || "",
      chanceOfPlaying: el.chance_of_playing_this_round,
      threat: Number(el.threat) || 0,
    });
  }
  return players;
}

/** fplId -> goals scored that gameweek (only entries with at least 1 goal). Free, no key needed. */
export async function fetchGameweekScorers(gw: number): Promise<Map<number, number>> {
  const resp = await fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!resp.ok) return new Map();
  const data: { elements: { id: number; stats: { goals_scored: number } }[] } = await resp.json();
  const scorers = new Map<number, number>();
  for (const el of data.elements) {
    if (el.stats.goals_scored > 0) scorers.set(el.id, el.stats.goals_scored);
  }
  return scorers;
}
