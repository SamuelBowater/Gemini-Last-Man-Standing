import type { Phase, Fixture, Participant } from "@/lib/types";
import type { TeamResult } from "@/lib/teams";

export interface TeamGameState {
  currentGW: number;
  phase: Phase;
  season: string;
  pickDeadline: string | null;
  locked: boolean;
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

export type MatchStage = "not_started" | "in_progress" | "finished" | "unplayed";

export interface TeamGameweekRow {
  id: number;
  name: string;
  overallStatus: "alive" | "eliminated";
  submitted: boolean;
  team: string | null;
  result: TeamResult | null;
  matchStage?: MatchStage | null;
  eliminatedThisGW: boolean;
}

export interface TeamTopPick {
  team: string;
  picks: number;
  result: TeamResult;
  matchStage?: MatchStage | null;
}

export interface TeamGameweekReport {
  gw: number;
  currentGW: number;
  resolved: boolean;
  picksVisible: boolean;
  winningTeams: string[];
  rows: TeamGameweekRow[];
  poolStats: { total: number; stillStanding: number; eliminated: number };
  topPicks: TeamTopPick[] | null;
}
