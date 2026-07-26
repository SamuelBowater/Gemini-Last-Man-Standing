"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, Badge, GhostButton } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import {
  CURRENT_GW,
  YOU,
  ELIMINATED_GW,
  PICKS,
  demoResult,
  type TeamDemoResult,
} from "@/lib/demoTeamData";

const STILL_STANDING = Object.values(ELIMINATED_GW).filter((v) => v === null).length;
const TOTAL = Object.keys(ELIMINATED_GW).length;
const YOU_ELIMINATED_GW = ELIMINATED_GW[YOU];

interface DemoFixture {
  home: string;
  away: string;
  kickoff: string;
  status: "FINISHED" | "SCHEDULED" | "IN_PLAY";
  homeScore: number | null;
  awayScore: number | null;
}

const FIXTURES: DemoFixture[] = [
  {
    home: "Newcastle United FC",
    away: "Aston Villa FC",
    kickoff: "Sat 11 Oct, 15:00",
    status: "FINISHED",
    homeScore: 2,
    awayScore: 0,
  },
  {
    home: "Manchester City FC",
    away: "Fulham FC",
    kickoff: "Sat 11 Oct, 15:00",
    status: "IN_PLAY",
    homeScore: 1,
    awayScore: 1,
  },
  {
    home: "Liverpool FC",
    away: "Everton FC",
    kickoff: "Sun 12 Oct, 16:30",
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
  },
  {
    home: "Arsenal FC",
    away: "Brentford FC",
    kickoff: "Sun 12 Oct, 14:00",
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
  },
];

function fixtureStatusLabel(status: DemoFixture["status"]): string {
  if (status === "FINISHED") return "FT";
  if (status === "IN_PLAY") return "Live";
  return "";
}

function ResultBadge({ result }: { result: TeamDemoResult }) {
  const label: Record<TeamDemoResult, string> = { win: "Won ✓", draw: "Drew", loss: "Lost" };
  const tone: "alive" | "out" = result === "win" ? "alive" : "out";
  return <Badge tone={tone}>{label[result]}</Badge>;
}

export default function DemoTeamsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const history = Object.keys(PICKS)
    .map(Number)
    .filter((gw) => gw < CURRENT_GW && PICKS[gw][YOU])
    .sort((a, b) => b - a)
    .map((gw) => ({ gw, team: PICKS[gw][YOU], result: demoResult(gw, PICKS[gw][YOU]) }));

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-24 pt-7">
      <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-6 text-[13px] text-center">
        This is a demo page with made-up players, scores and standings, showing roughly what
        Team Survival looks like a few gameweeks into a season — including what it looks like
        when a team you picked gets knocked out. It isn&apos;t connected to your real pool.{" "}
        <Link href="/demo" className="underline font-semibold">
          Back to the Player Picks demo →
        </Link>
      </div>

      <div className="text-center pb-6 mb-6 border-b border-line">
        <Link href="/" className="inline-block font-mono text-[11px] text-text-dim hover:text-accent mb-3">
          ← All games
        </Link>
        <div className="font-mono text-[12px] tracking-[3px] uppercase text-accent mb-2.5">
          Team Survival
        </div>
        <h1 className="font-display text-[54px] leading-[0.95] mb-3 text-text">
          Pick a Team
          <br />
          Survive the Week
        </h1>
        <p className="text-text-dim text-[15px] max-w-[460px] mx-auto leading-relaxed">
          Pick one Premier League team every gameweek. Win and you go through — draw or lose and
          you&apos;re out.
        </p>
        <div className="inline-flex mt-5 border border-line-strong rounded-[10px] overflow-hidden bg-bg-deep">
          {[
            { num: String(CURRENT_GW).padStart(2, "0"), label: "Gameweek" },
            { num: STILL_STANDING, label: "Still In" },
            { num: TOTAL, label: "Entered" },
          ].map((cell, i) => (
            <div key={i} className={`px-5 py-2.5 text-center ${i < 2 ? "border-r border-line" : ""}`}>
              <div className="font-mono text-[22px] font-bold text-accent">{cell.num}</div>
              <div className="text-[10px] tracking-[1.5px] text-text-dim uppercase mt-0.5">{cell.label}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2.5 mt-5 flex-wrap">
          <GhostButton className="px-4 py-2 text-[13px]" disabled>
            📖 How it works
          </GhostButton>
          <Link
            href="/demo/teams/standings"
            className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
          >
            📊 Standings
          </Link>
          <Link
            href="/demo/teams/admin"
            className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
          >
            🛠️ Admin
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 text-[13px] text-text-dim">
        <span>
          Logged in as <strong className="text-text">{YOU}</strong>
        </span>
        <GhostButton className="px-3 py-1.5 text-[11px]" disabled>
          🚪 Log out
        </GhostButton>
      </div>

      <Panel>
        <PanelTitle>Fixtures</PanelTitle>
        <div className="flex flex-col gap-2">
          {FIXTURES.map((f, i) => {
            const isOpen = expanded === i;
            const hasScore = f.homeScore !== null && f.awayScore !== null;
            return (
              <div key={i} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex justify-between items-center gap-3 text-left"
                >
                  <div>
                    <div className="font-semibold flex items-center gap-1.5">
                      <TeamBadge team={f.home} size={20} />
                      {f.home} <span className="text-text-dim font-normal">v</span>
                      <TeamBadge team={f.away} size={20} />
                      {f.away}
                    </div>
                    {hasScore ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-bold text-text">
                          {f.homeScore} - {f.awayScore}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                          {fixtureStatusLabel(f.status)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11.5px] text-text-dim">{f.kickoff}</div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </Panel>

      {YOU_ELIMINATED_GW !== null ? (
        <Panel>
          <PanelTitle>You&apos;re out</PanelTitle>
          <div className="flex items-center justify-between gap-3.5 mb-3">
            <div className="text-lg font-bold">{YOU}</div>
            <Badge tone="out">Eliminated · GW{YOU_ELIMINATED_GW}</Badge>
          </div>
          <Sub>
            Your team didn&apos;t win in gameweek {YOU_ELIMINATED_GW}. Stick around and watch the
            rest of the pool play out below.
          </Sub>
        </Panel>
      ) : (
        <Panel>
          <PanelTitle>Pick locked — GW{CURRENT_GW}</PanelTitle>
          <Sub>Waiting on the admin to log this gameweek&apos;s results.</Sub>
        </Panel>
      )}

      <Panel>
        <PanelTitle>Your picks so far</PanelTitle>
        <div className="flex flex-col gap-2">
          {history.map((h) => (
            <div
              key={h.gw}
              className={`bg-bg-deep border rounded-xl px-3.5 py-3 flex justify-between items-center ${
                h.gw === YOU_ELIMINATED_GW ? "border-red" : "border-line"
              }`}
            >
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-text-dim mb-1">
                  Gameweek {h.gw}
                  {h.gw === YOU_ELIMINATED_GW && (
                    <span className="text-red normal-case font-normal"> · the pick that knocked you out</span>
                  )}
                </div>
                <div className="font-semibold flex items-center gap-1.5">
                  <TeamBadge team={h.team} size={20} />
                  {h.team}
                </div>
              </div>
              <ResultBadge result={h.result} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="text-center mt-8">
        <Link href="/demo" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to Player Picks demo
        </Link>
      </div>

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI&apos;S LAST MAN STANDING · pick wisely, there&apos;s no going back · DEMO DATA
      </footer>
    </div>
  );
}
