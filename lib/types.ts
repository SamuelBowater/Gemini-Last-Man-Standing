export type Phase = "picking" | "finished";

export interface GameState {
  currentGW: number;
  phase: Phase;
  season: string;
  apiSeason: string;
}

export interface Participant {
  id: number;
  name: string;
  status: "alive" | "eliminated";
  eliminatedGW: number | null;
  submitted?: boolean;
}

export interface Fixture {
  id?: number;
  home: string;
  away: string;
  kickoff: string | null;
  venue?: string | null;
  status?: string | null;
  source?: string;
}

export interface Pick {
  forward: string;
  midfielder: string;
  defender: string;
}

export interface Me extends Participant {
  pick: Pick | null;
  usedPlayers: string[];
}

export interface StateResponse {
  gameState: GameState;
  participants: Participant[];
  fixtures: Fixture[];
  officialFixturesUrl: string;
  me: Me | null;
}
