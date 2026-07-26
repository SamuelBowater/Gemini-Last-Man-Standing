export const ELIMINATED_GW: Record<string, number | null> = {
  "Jordan Blake": 3,
  "Priya Shah": null,
  "Sam Ostrowski": null,
  "Alex Morgan": 3,
  "Deja Whitfield": 2,
  "Marcus Field": 2,
  "Nina Torres": 2,
  "Owen Castillo": 1,
  "Freya Lindqvist": 1,
  "Callum Ashworth": 1,
  "Ruby Okonkwo": 1,
  "Theo Bassett": 1,
};

export const PARTICIPANT_ORDER = Object.keys(ELIMINATED_GW);
export const CURRENT_GW = 4;
export const YOU = "Jordan Blake";

// Winners each gameweek — a pick "wins" if the team appears here. Anything
// picked that isn't listed here (and isn't in DRAWN_TEAMS) counts as a loss.
export const WINNING_TEAMS: Record<number, string[]> = {
  1: [
    "Arsenal FC",
    "Manchester City FC",
    "Liverpool FC",
    "Chelsea FC",
    "Tottenham Hotspur FC",
    "Newcastle United FC",
    "Brighton & Hove Albion FC",
  ],
  2: ["Manchester United FC", "Everton FC", "Crystal Palace FC", "Brentford FC"],
  3: ["Manchester City FC", "Newcastle United FC"],
};

export const DRAWN_TEAMS: Record<number, string[]> = {
  1: ["Coventry City FC", "Hull City AFC"],
  2: [],
  3: [],
};

export const PICKS: Record<number, Record<string, string>> = {
  1: {
    "Jordan Blake": "Arsenal FC",
    "Priya Shah": "Manchester City FC",
    "Sam Ostrowski": "Liverpool FC",
    "Alex Morgan": "Chelsea FC",
    "Deja Whitfield": "Tottenham Hotspur FC",
    "Marcus Field": "Newcastle United FC",
    "Nina Torres": "Brighton & Hove Albion FC",
    "Owen Castillo": "Coventry City FC",
    "Freya Lindqvist": "Hull City AFC",
    "Callum Ashworth": "Ipswich Town FC",
    "Ruby Okonkwo": "Sunderland AFC",
    "Theo Bassett": "Nottingham Forest FC",
  },
  2: {
    "Jordan Blake": "Manchester United FC",
    "Priya Shah": "Everton FC",
    "Sam Ostrowski": "Crystal Palace FC",
    "Alex Morgan": "Brentford FC",
    "Deja Whitfield": "AFC Bournemouth",
    "Marcus Field": "Leeds United FC",
    "Nina Torres": "Fulham FC",
  },
  3: {
    "Jordan Blake": "Chelsea FC",
    "Priya Shah": "Newcastle United FC",
    "Sam Ostrowski": "Manchester City FC",
    "Alex Morgan": "Arsenal FC",
  },
};

export const SUBMITTED_GW4 = new Set(["Priya Shah", "Sam Ostrowski"]);

export type TeamDemoResult = "win" | "draw" | "loss";

export function demoResult(gw: number, team: string): TeamDemoResult {
  if ((WINNING_TEAMS[gw] || []).includes(team)) return "win";
  if ((DRAWN_TEAMS[gw] || []).includes(team)) return "draw";
  return "loss";
}

export interface DemoTeamRow {
  name: string;
  overallStatus: "alive" | "eliminated";
  submitted: boolean;
  team: string | null;
  result: TeamDemoResult | "pending" | null;
  eliminatedThisGW: boolean;
}

export interface DemoTeamTopPick {
  team: string;
  picks: number;
  result: TeamDemoResult;
}

export function buildTeamReport(gw: number) {
  const resolved = gw < CURRENT_GW;

  const tier = (name: string) => {
    const elimGW = ELIMINATED_GW[name];
    if (elimGW === null || elimGW > gw) return 0;
    if (elimGW === gw) return 1;
    return 2;
  };

  const rows: DemoTeamRow[] = [...PARTICIPANT_ORDER]
    .sort((a, b) => {
      const diff = tier(a) - tier(b);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    })
    .map((name) => {
      const elimGW = ELIMINATED_GW[name];
      const overallStatus: "alive" | "eliminated" = elimGW !== null && elimGW <= gw ? "eliminated" : "alive";
      const pick = gw === CURRENT_GW ? undefined : PICKS[gw]?.[name];
      const submitted = gw === CURRENT_GW ? SUBMITTED_GW4.has(name) : Boolean(pick);

      if (gw === CURRENT_GW) {
        return {
          name,
          overallStatus,
          submitted,
          team: null,
          result: null,
          eliminatedThisGW: false,
        };
      }

      return {
        name,
        overallStatus,
        submitted,
        team: resolved ? pick ?? null : null,
        result: resolved ? (pick ? demoResult(gw, pick) : null) : pick ? "pending" : null,
        eliminatedThisGW: elimGW === gw,
      };
    });

  const winningTeams = WINNING_TEAMS[gw] || [];

  const topPicksFor = (): DemoTeamTopPick[] => {
    if (!resolved) return [];
    const counts = new Map<string, number>();
    for (const name of PARTICIPANT_ORDER) {
      const pick = PICKS[gw]?.[name];
      if (!pick) continue;
      counts.set(pick, (counts.get(pick) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([team, count]) => ({ team, picks: count, result: demoResult(gw, team) }));
  };

  const poolStats = {
    total: PARTICIPANT_ORDER.length,
    stillStanding: PARTICIPANT_ORDER.filter((n) => ELIMINATED_GW[n] === null).length,
    eliminated: PARTICIPANT_ORDER.filter((n) => ELIMINATED_GW[n] !== null).length,
  };

  return {
    gw,
    resolved,
    winningTeams,
    rows,
    poolStats,
    topPicks: resolved ? topPicksFor() : null,
  };
}
