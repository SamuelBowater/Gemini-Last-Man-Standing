"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, Badge } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import { PARTICIPANT_ORDER, ELIMINATED_GW, PICKS, WINNING_TEAMS } from "@/lib/demoTeamData";

const MAX_DEMO_GW = 3;

export default function DemoTeamsAdminPage() {
  const [gw, setGw] = useState(1);
  const [winningTeams, setWinningTeams] = useState<string[]>(WINNING_TEAMS[1] || []);
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState(
    PARTICIPANT_ORDER.map((name) => ({
      name,
      status: "alive" as "alive" | "eliminated",
      eliminatedGW: null as number | null,
    }))
  );

  const teamsInPlay = Array.from(new Set(Object.values(PICKS[gw] || {}))).sort();

  function toggleTeam(team: string) {
    setWinningTeams((old) => (old.includes(team) ? old.filter((t) => t !== team) : [...old, team]));
  }

  function refreshSuggestions() {
    setWinningTeams(WINNING_TEAMS[gw] || []);
    setMsg("");
  }

  function apply() {
    const eliminatedNow = players.filter(
      (p) => p.status === "alive" && PICKS[gw]?.[p.name] && !winningTeams.includes(PICKS[gw][p.name])
    );
    setPlayers((prev) =>
      prev.map((p) =>
        eliminatedNow.some((e) => e.name === p.name) ? { ...p, status: "eliminated", eliminatedGW: gw } : p
      )
    );
    const nextGW = gw + 1;
    setMsg(`Applied. ${eliminatedNow.length} eliminated. Now on GW${nextGW}.`);
    setGw(nextGW);
    setWinningTeams(WINNING_TEAMS[nextGW] || []);
  }

  const stillStanding = players.filter((p) => p.status === "alive").length;
  const atDemoLimit = gw > MAX_DEMO_GW;

  return (
    <div className="max-w-[640px] mx-auto px-4 pb-24 pt-8">
      <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-6 text-[13px] text-center">
        This is a demo of the Team Survival admin dashboard with made-up players and results —
        nothing here touches your real pool.{" "}
        <Link href="/demo/teams" className="underline font-semibold">
          Back to the demo home →
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/demo/teams" className="font-mono text-[11px] text-text-dim hover:text-accent">
            ← Team Survival demo
          </Link>
          <h1 className="font-display text-3xl mt-1">Team Survival admin</h1>
        </div>
        <GhostButton className="text-[11px] px-3 py-1.5" disabled>
          Log out
        </GhostButton>
      </div>

      <Panel>
        <PanelTitle>Pool status</PanelTitle>
        <div className="flex gap-6 font-mono text-sm text-text-dim">
          <div>
            Gameweek: <span className="text-accent">{Math.min(gw, MAX_DEMO_GW + 1)}</span>
          </div>
          <div>
            Phase: <span className="text-accent">picking</span>
          </div>
          <div>
            Still standing: <span className="text-accent">{stillStanding}</span>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Players</PanelTitle>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div key={p.name} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3">
              <div className="font-semibold">{p.name}</div>
              <Badge tone={p.status === "eliminated" ? "out" : "alive"}>
                {p.status === "eliminated" ? `Eliminated · GW${p.eliminatedGW}` : "Alive"}
              </Badge>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Results · Gameweek {Math.min(gw, MAX_DEMO_GW + 1)}</PanelTitle>
        {atDemoLimit ? (
          <Sub>
            That&apos;s as far as this demo&apos;s made-up data goes — gameweek {gw} would carry on
            exactly the same way in the real app.
          </Sub>
        ) : (
          <>
            <Sub>
              Tap the teams that won each match below — anyone whose picked team isn&apos;t marked
              as a winner goes out.
            </Sub>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={refreshSuggestions} className="text-[12px] text-accent hover:underline">
                🔮 Suggest from fixtures
              </button>
              <div className="text-[11.5px] text-text-dim">
                Derived {(WINNING_TEAMS[gw] || []).length} winning team{(WINNING_TEAMS[gw] || []).length === 1 ? "" : "s"} from synced fixtures.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {teamsInPlay.map((team) => {
                const selected = winningTeams.includes(team);
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() => toggleTeam(team)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold transition ${
                      selected
                        ? "bg-green-alive/10 border-green-alive/30 text-green-alive"
                        : "bg-panel border-line-strong text-text hover:border-accent/40"
                    }`}
                  >
                    <TeamBadge team={team} size={18} />
                    {team}
                    {selected && " ✓"}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <PrimaryButton onClick={apply}>Apply results &amp; advance</PrimaryButton>
            </div>
          </>
        )}
        {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
      </Panel>

      <Panel>
        <PanelTitle>Danger zone</PanelTitle>
        <DangerButton disabled>Reset entire pool</DangerButton>
      </Panel>

      <div className="text-center mt-8">
        <Link href="/demo/teams" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to demo home
        </Link>
      </div>
    </div>
  );
}
