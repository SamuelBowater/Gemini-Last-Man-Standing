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
