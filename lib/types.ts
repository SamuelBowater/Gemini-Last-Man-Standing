import type { PositionKey } from "@/lib/data";
import type { PlayerStatus } from "@/lib/players";

export type Phase = "picking" | "finished";

export interface LivePlayer {
  name: string;
  team: string;
  position: PositionKey;
  status: PlayerStatus;
  news: string;
  chanceOfPlaying: number | null;
  threat: number;
}

export interface GameState {
  currentGW: number;
  phase: Phase;
  season: string;
  pickDeadline: string | null;
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
  homeScore?: number | null;
  awayScore?: number | null;
  homeScorers?: string[];
  awayScorers?: string[];
  source?: string;
}

export interface Pick {
  forward: string;
  midfielder: string;
  defender: string;
}

export interface PickHistoryEntry {
  gw: number;
  forward: string;
  midfielder: string;
  defender: string;
  resolved: boolean;
  forwardScored: boolean | null;
  midfielderScored: boolean | null;
  defenderScored: boolean | null;
}

export interface Me extends Participant {
  pick: Pick | null;
  usedPlayers: string[];
  history: PickHistoryEntry[];
}

export interface StateResponse {
  gameState: GameState;
  participants: Participant[];
  fixtures: Fixture[];
  officialFixturesUrl: string;
  me: Me | null;
}

export interface GameweekPlayerRow {
  id: number;
  name: string;
  overallStatus: "alive" | "eliminated";
  submitted: boolean;
  forward: string | null;
  midfielder: string | null;
  defender: string | null;
  forwardScored: boolean | null;
  midfielderScored: boolean | null;
  defenderScored: boolean | null;
  survived: boolean | null;
  eliminatedThisGW: boolean;
}

export interface TopPick {
  name: string;
  picks: number;
  scored: boolean;
}

export interface GameweekReport {
  gw: number;
  currentGW: number;
  resolved: boolean;
  scorers: string[];
  players: GameweekPlayerRow[];
  poolStats: { total: number; stillStanding: number; eliminated: number };
  topPicks: { forward: TopPick[]; midfielder: TopPick[]; defender: TopPick[] } | null;
}
