import type { Phase, Fixture, Participant } from "@/lib/types";
import type { TeamResult } from "@/lib/teams";

export interface TeamGameState {
  currentGW: number;
  phase: Phase;
  season: string;
  pickDeadline: string | null;
}

export interface TeamPick {
  team: string;
}

export interface TeamPickHistoryEntry {
  gw: number;
  team: string;
  result: TeamResult;
}

export interface TeamMe extends Participant {
  pick: TeamPick | null;
  usedTeams: string[];
  history: TeamPickHistoryEntry[];
}

export interface TeamStateResponse {
  gameState: TeamGameState;
  participants: Participant[];
  fixtures: Fixture[];
  officialFixturesUrl: string;
  availableTeams: string[];
  me: TeamMe | null;
}

export interface TeamGameweekRow {
  id: number;
  name: string;
  overallStatus: "alive" | "eliminated";
  submitted: boolean;
  team: string | null;
  result: TeamResult | null;
  eliminatedThisGW: boolean;
}

export interface TeamTopPick {
  team: string;
  picks: number;
  result: TeamResult;
}

export interface TeamGameweekReport {
  gw: number;
  currentGW: number;
  resolved: boolean;
  winningTeams: string[];
  rows: TeamGameweekRow[];
  poolStats: { total: number; stillStanding: number; eliminated: number };
  topPicks: TeamTopPick[] | null;
}
