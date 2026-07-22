export type Position = "forward" | "midfielder" | "defender";

export interface DemoPick {
  forward: string;
  midfielder: string;
  defender: string;
}

export const ELIMINATED_GW: Record<string, number | null> = {
  "Jordan Blake": null,
  "Priya Shah": null,
  "Sam Ostrowski": null,
  "Alex Morgan": null,
  "Deja Whitfield": null,
  "Marcus Field": 4,
  "Nina Torres": 4,
  "Owen Castillo": 3,
  "Freya Lindqvist": 3,
  "Callum Ashworth": 2,
  "Ruby Okonkwo": 2,
  "Theo Bassett": 1,
};

export const PARTICIPANT_ORDER = Object.keys(ELIMINATED_GW);
export const CURRENT_GW = 5;

// The single source of truth for who scored each gameweek — a pick "scores"
// if the player's name appears here, so every participant who picked the
// same player automatically agrees on the outcome (no hand-authored conflicts).
export const SCORERS: Record<number, string[]> = {
  1: ["erling haaland", "bukayo saka", "josko gvardiol", "viktor gyökeres", "bryan mbeumo", "jarrod bowen"],
  2: ["bukayo saka", "ollie watkins", "morgan rogers", "antoine semenyo", "dominic solanke", "jean-philippe mateta"],
  3: ["josko gvardiol", "milos kerkez", "levi colwill", "jarrod bowen", "william saliba"],
  4: ["viktor gyökeres", "mohamed salah", "martin odegaard", "trent alexander-arnold"],
};

// Real-cased display names for each gameweek's scorers (matches SCORERS above).
export const SCORER_NAMES: Record<number, string[]> = {
  1: ["Erling Haaland", "Bukayo Saka", "Josko Gvardiol", "Viktor Gyökeres", "Bryan Mbeumo", "Jarrod Bowen"],
  2: ["Bukayo Saka", "Ollie Watkins", "Morgan Rogers", "Antoine Semenyo", "Dominic Solanke", "Jean-Philippe Mateta"],
  3: ["Josko Gvardiol", "Milos Kerkez", "Levi Colwill", "Jarrod Bowen", "William Saliba"],
  4: ["Viktor Gyökeres", "Mohamed Salah", "Martin Odegaard", "Trent Alexander-Arnold"],
};

export const PICKS: Record<number, Record<string, DemoPick>> = {
  1: {
    "Jordan Blake": { forward: "Erling Haaland", midfielder: "Cole Palmer", defender: "Virgil van Dijk" },
    "Priya Shah": { forward: "Alexander Isak", midfielder: "Bukayo Saka", defender: "William Saliba" },
    "Sam Ostrowski": { forward: "Ollie Watkins", midfielder: "Morgan Rogers", defender: "Josko Gvardiol" },
    "Alex Morgan": { forward: "Viktor Gyökeres", midfielder: "Antoine Semenyo", defender: "Milos Kerkez" },
    "Deja Whitfield": { forward: "Dominic Solanke", midfielder: "Bryan Mbeumo", defender: "Levi Colwill" },
    "Marcus Field": { forward: "Erling Haaland", midfielder: "James Maddison", defender: "Pedro Porro" },
    "Nina Torres": { forward: "Chris Wood", midfielder: "Bukayo Saka", defender: "Trent Alexander-Arnold" },
    "Owen Castillo": { forward: "Yoane Wissa", midfielder: "Jarrod Bowen", defender: "Josko Gvardiol" },
    "Freya Lindqvist": { forward: "Viktor Gyökeres", midfielder: "Emile Smith Rowe", defender: "Gabriel Magalhaes" },
    "Callum Ashworth": { forward: "Jean-Philippe Mateta", midfielder: "Bryan Mbeumo", defender: "Nathan Ake" },
    "Ruby Okonkwo": { forward: "Erling Haaland", midfielder: "Kaoru Mitoma", defender: "Rico Lewis" },
    "Theo Bassett": { forward: "Yoane Wissa", midfielder: "Morgan Rogers", defender: "Levi Colwill" },
  },
  2: {
    "Jordan Blake": { forward: "Alexander Isak", midfielder: "Bukayo Saka", defender: "William Saliba" },
    "Priya Shah": { forward: "Dominic Solanke", midfielder: "Kaoru Mitoma", defender: "Pedro Porro" },
    "Sam Ostrowski": { forward: "Ollie Watkins", midfielder: "James Maddison", defender: "Ezri Konsa" },
    "Alex Morgan": { forward: "Nicolas Jackson", midfielder: "Antoine Semenyo", defender: "Nathan Ake" },
    "Deja Whitfield": { forward: "Jean-Philippe Mateta", midfielder: "Jacob Murphy", defender: "Vladimir Coufal" },
    "Marcus Field": { forward: "Ollie Watkins", midfielder: "Martin Odegaard", defender: "Murillo" },
    "Nina Torres": { forward: "Chris Wood", midfielder: "Morgan Rogers", defender: "Rico Lewis" },
    "Owen Castillo": { forward: "Dominic Solanke", midfielder: "Eberechi Eze", defender: "Antonee Robinson" },
    "Freya Lindqvist": { forward: "Jean-Philippe Mateta", midfielder: "Phil Foden", defender: "Destiny Udogie" },
    "Callum Ashworth": { forward: "Yoane Wissa", midfielder: "Cole Palmer", defender: "Virgil van Dijk" },
    "Ruby Okonkwo": { forward: "Liam Delap", midfielder: "Bruno Fernandes", defender: "Trent Alexander-Arnold" },
  },
  3: {
    "Jordan Blake": { forward: "Ollie Watkins", midfielder: "Morgan Rogers", defender: "Josko Gvardiol" },
    "Priya Shah": { forward: "Chris Wood", midfielder: "Eberechi Eze", defender: "William Saliba" },
    "Sam Ostrowski": { forward: "Nicolas Jackson", midfielder: "James Maddison", defender: "Milos Kerkez" },
    "Alex Morgan": { forward: "Danny Welbeck", midfielder: "Phil Foden", defender: "Levi Colwill" },
    "Deja Whitfield": { forward: "Matheus Cunha", midfielder: "Jarrod Bowen", defender: "Antonee Robinson" },
    "Marcus Field": { forward: "Evanilson", midfielder: "Martin Odegaard", defender: "Josko Gvardiol" },
    "Nina Torres": { forward: "Joao Pedro", midfielder: "Emile Smith Rowe", defender: "William Saliba" },
    "Owen Castillo": { forward: "Liam Delap", midfielder: "Martin Odegaard", defender: "Murillo" },
    "Freya Lindqvist": { forward: "Yoane Wissa", midfielder: "Antoine Semenyo", defender: "Ezri Konsa" },
  },
  4: {
    "Jordan Blake": { forward: "Viktor Gyökeres", midfielder: "Antoine Semenyo", defender: "Milos Kerkez" },
    "Priya Shah": { forward: "Yoane Wissa", midfielder: "Martin Odegaard", defender: "Ezri Konsa" },
    "Sam Ostrowski": { forward: "Liam Delap", midfielder: "Bruno Fernandes", defender: "Trent Alexander-Arnold" },
    "Alex Morgan": { forward: "Dominic Solanke", midfielder: "Martin Odegaard", defender: "Destiny Udogie" },
    "Deja Whitfield": { forward: "Viktor Gyökeres", midfielder: "Cole Palmer", defender: "Antonee Robinson" },
    "Marcus Field": { forward: "Danny Welbeck", midfielder: "Jarrod Bowen", defender: "Murillo" },
    "Nina Torres": { forward: "Matheus Cunha", midfielder: "Eberechi Eze", defender: "Vladimir Coufal" },
  },
};

export const SUBMITTED_GW5 = new Set(["Jordan Blake", "Priya Shah", "Sam Ostrowski", "Alex Morgan", "Deja Whitfield"]);

// 4-digit login codes for the "Manage players" mock in the demo admin page.
export const DEMO_CODES: Record<string, string> = {
  "Jordan Blake": "4821",
  "Priya Shah": "7734",
  "Sam Ostrowski": "1092",
  "Alex Morgan": "5560",
  "Deja Whitfield": "3387",
  "Marcus Field": "9021",
  "Nina Torres": "6674",
  "Owen Castillo": "2245",
  "Freya Lindqvist": "8813",
  "Callum Ashworth": "4409",
  "Ruby Okonkwo": "1156",
  "Theo Bassett": "7702",
};

export interface DemoRow {
  name: string;
  overallStatus: "alive" | "eliminated";
  submitted: boolean;
  forward: string | null;
  midfielder: string | null;
  defender: string | null;
  forwardScored: boolean | null;
  midfielderScored: boolean | null;
  defenderScored: boolean | null;
  eliminatedThisGW: boolean;
}

export interface DemoTopPick {
  name: string;
  picks: number;
  scored: boolean;
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildReport(gw: number) {
  const resolved = gw < CURRENT_GW;
  const scorerSet = new Set(SCORERS[gw] || []);
  const scored = (name: string | null) => (name ? scorerSet.has(name.toLowerCase()) : false);

  // Sort tier: still in it (0), eliminated this exact gameweek — has real
  // picks to show (1), already gone before this gameweek — just blanks (2).
  const tier = (name: string) => {
    const elimGW = ELIMINATED_GW[name];
    if (elimGW === null || elimGW > gw) return 0;
    if (elimGW === gw) return 1;
    return 2;
  };

  const rows: DemoRow[] = [...PARTICIPANT_ORDER]
    .sort((a, b) => {
      const diff = tier(a) - tier(b);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    })
    .map((name) => {
    const elimGW = ELIMINATED_GW[name];
    // Status as of THIS gameweek, not the participant's final status — so
    // looking back at an earlier week shows who was actually still in it.
    const overallStatus: "alive" | "eliminated" =
      elimGW !== null && elimGW <= gw ? "eliminated" : "alive";
    const pick = gw === CURRENT_GW ? undefined : PICKS[gw]?.[name];
    const submitted = gw === CURRENT_GW ? SUBMITTED_GW5.has(name) : Boolean(pick);

    if (gw === CURRENT_GW) {
      return {
        name,
        overallStatus,
        submitted,
        forward: null,
        midfielder: null,
        defender: null,
        forwardScored: null,
        midfielderScored: null,
        defenderScored: null,
        eliminatedThisGW: false,
      };
    }

    return {
      name,
      overallStatus,
      submitted,
      forward: resolved ? pick?.forward ?? null : null,
      midfielder: resolved ? pick?.midfielder ?? null : null,
      defender: resolved ? pick?.defender ?? null : null,
      forwardScored: resolved && pick ? scored(pick.forward) : null,
      midfielderScored: resolved && pick ? scored(pick.midfielder) : null,
      defenderScored: resolved && pick ? scored(pick.defender) : null,
      eliminatedThisGW: elimGW === gw,
    };
  });

  const scorers = Array.from(scorerSet).sort();

  const topPicksFor = (position: Position): DemoTopPick[] => {
    if (!resolved) return [];
    const counts = new Map<string, number>();
    for (const name of PARTICIPANT_ORDER) {
      const pick = PICKS[gw]?.[name];
      if (!pick) continue;
      const player = pick[position];
      counts.set(player, (counts.get(player) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([player, count]) => ({ name: player, picks: count, scored: scored(player) }));
  };

  const poolStats = {
    total: PARTICIPANT_ORDER.length,
    stillStanding: PARTICIPANT_ORDER.filter((n) => ELIMINATED_GW[n] === null).length,
    eliminated: PARTICIPANT_ORDER.filter((n) => ELIMINATED_GW[n] !== null).length,
  };

  return {
    gw,
    resolved,
    scorers,
    rows,
    poolStats,
    topPicks: resolved
      ? {
          forward: topPicksFor("forward"),
          midfielder: topPicksFor("midfielder"),
          defender: topPicksFor("defender"),
        }
      : null,
  };
}
