"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, Badge, GhostButton, EmptyNote } from "@/components/ui";

const CURRENT_GW = 5;
const STILL_IN = 5;
const TOTAL = 12;

interface DemoFixture {
  home: string;
  away: string;
  kickoff: string;
  status: "FINISHED" | "SCHEDULED" | "IN_PLAY";
  homeScore: number | null;
  awayScore: number | null;
  homeScorers: string[];
  awayScorers: string[];
  homeThreats: { name: string; pos: string }[];
  awayThreats: { name: string; pos: string }[];
}

const FIXTURES: DemoFixture[] = [
  {
    home: "Manchester City FC",
    away: "AFC Bournemouth",
    kickoff: "Sat 20 Sep, 15:00",
    status: "FINISHED",
    homeScore: 3,
    awayScore: 1,
    homeScorers: ["Erling Haaland (2)", "Rayan Cherki"],
    awayScorers: ["Antoine Semenyo"],
    homeThreats: [
      { name: "Erling Haaland", pos: "FWD" },
      { name: "Rayan Cherki", pos: "MID" },
      { name: "Josko Gvardiol", pos: "DEF" },
    ],
    awayThreats: [
      { name: "Antoine Semenyo", pos: "FWD" },
      { name: "Justin Kluivert", pos: "MID" },
      { name: "Milos Kerkez", pos: "DEF" },
    ],
  },
  {
    home: "Liverpool FC",
    away: "Newcastle United FC",
    kickoff: "Sat 20 Sep, 15:00",
    status: "IN_PLAY",
    homeScore: 1,
    awayScore: 1,
    homeScorers: ["Mohamed Salah"],
    awayScorers: ["Alexander Isak"],
    homeThreats: [
      { name: "Mohamed Salah", pos: "FWD" },
      { name: "Cody Gakpo", pos: "MID" },
      { name: "Virgil van Dijk", pos: "DEF" },
    ],
    awayThreats: [
      { name: "Alexander Isak", pos: "FWD" },
      { name: "Anthony Gordon", pos: "MID" },
      { name: "Sven Botman", pos: "DEF" },
    ],
  },
  {
    home: "Arsenal FC",
    away: "Chelsea FC",
    kickoff: "Sun 21 Sep, 16:30",
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    homeScorers: [],
    awayScorers: [],
    homeThreats: [
      { name: "Bukayo Saka", pos: "MID" },
      { name: "Viktor Gyökeres", pos: "FWD" },
      { name: "William Saliba", pos: "DEF" },
    ],
    awayThreats: [
      { name: "Cole Palmer", pos: "MID" },
      { name: "Joao Pedro", pos: "FWD" },
      { name: "Levi Colwill", pos: "DEF" },
    ],
  },
  {
    home: "Aston Villa FC",
    away: "Tottenham Hotspur FC",
    kickoff: "Sun 21 Sep, 14:00",
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    homeScorers: [],
    awayScorers: [],
    homeThreats: [
      { name: "Morgan Rogers", pos: "MID" },
      { name: "Ollie Watkins", pos: "FWD" },
      { name: "Ezri Konsa", pos: "DEF" },
    ],
    awayThreats: [
      { name: "Richarlison", pos: "FWD" },
      { name: "James Maddison", pos: "MID" },
      { name: "Pedro Porro", pos: "DEF" },
    ],
  },
];

interface DemoHistoryEntry {
  gw: number;
  forward: string;
  midfielder: string;
  defender: string;
  forwardScored: boolean;
  midfielderScored: boolean;
  defenderScored: boolean;
}

const YOUR_HISTORY: DemoHistoryEntry[] = [
  {
    gw: 1,
    forward: "Erling Haaland",
    midfielder: "Cole Palmer",
    defender: "Virgil van Dijk",
    forwardScored: true,
    midfielderScored: false,
    defenderScored: false,
  },
  {
    gw: 2,
    forward: "Alexander Isak",
    midfielder: "Bukayo Saka",
    defender: "William Saliba",
    forwardScored: false,
    midfielderScored: true,
    defenderScored: false,
  },
  {
    gw: 3,
    forward: "Ollie Watkins",
    midfielder: "Morgan Rogers",
    defender: "Josko Gvardiol",
    forwardScored: false,
    midfielderScored: false,
    defenderScored: true,
  },
  {
    gw: 4,
    forward: "Viktor Gyökeres",
    midfielder: "Antoine Semenyo",
    defender: "Milos Kerkez",
    forwardScored: true,
    midfielderScored: false,
    defenderScored: false,
  },
];

interface DemoParticipant {
  name: string;
  status: "alive" | "eliminated";
  eliminatedGW: number | null;
  survivedThrough: number;
}

const PARTICIPANTS: DemoParticipant[] = [
  { name: "Jordan Blake", status: "alive", eliminatedGW: null, survivedThrough: 4 },
  { name: "Priya Shah", status: "alive", eliminatedGW: null, survivedThrough: 4 },
  { name: "Sam Ostrowski", status: "alive", eliminatedGW: null, survivedThrough: 4 },
  { name: "Alex Morgan", status: "alive", eliminatedGW: null, survivedThrough: 4 },
  { name: "Deja Whitfield", status: "alive", eliminatedGW: null, survivedThrough: 4 },
  { name: "Marcus Field", status: "eliminated", eliminatedGW: 4, survivedThrough: 3 },
  { name: "Nina Torres", status: "eliminated", eliminatedGW: 4, survivedThrough: 3 },
  { name: "Owen Castillo", status: "eliminated", eliminatedGW: 3, survivedThrough: 2 },
  { name: "Freya Lindqvist", status: "eliminated", eliminatedGW: 3, survivedThrough: 2 },
  { name: "Callum Ashworth", status: "eliminated", eliminatedGW: 2, survivedThrough: 1 },
  { name: "Ruby Okonkwo", status: "eliminated", eliminatedGW: 2, survivedThrough: 1 },
  { name: "Theo Bassett", status: "eliminated", eliminatedGW: 1, survivedThrough: 0 },
];

function fixtureStatusLabel(status: DemoFixture["status"]): string {
  if (status === "FINISHED") return "FT";
  if (status === "IN_PLAY") return "Live";
  return "";
}

export default function DemoPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const alive = PARTICIPANTS.filter((p) => p.status === "alive");
  const out = PARTICIPANTS.filter((p) => p.status === "eliminated").sort(
    (a, b) => (b.eliminatedGW || 0) - (a.eliminatedGW || 0)
  );

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-24 pt-7">
      <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-6 text-[13px] text-center">
        This is a demo page with made-up players, scores and standings, showing roughly what
        the app looks like a few gameweeks into a season. It isn&apos;t connected to your real
        pool.{" "}
        <Link href="/players" className="underline font-semibold">
          Back to the real thing →
        </Link>
      </div>

      <div className="text-center pb-6 mb-6 border-b border-line">
        <div className="font-mono text-[12px] tracking-[3px] uppercase text-accent mb-2.5">
          Premier League Survival Pool
        </div>
        <h1 className="font-display text-[54px] leading-[0.95] mb-3 text-text">
          Gemini&apos;s Last Man
          <br />
          Standing
        </h1>
        <p className="text-text-dim text-[15px] max-w-[460px] mx-auto leading-relaxed">
          Pick a forward, a midfielder and a defender every gameweek. One of them has to find the
          net — or you&apos;re out.
        </p>
        <div className="inline-flex mt-5 border border-line-strong rounded-[10px] overflow-hidden bg-bg-deep">
          {[
            { num: String(CURRENT_GW).padStart(2, "0"), label: "Gameweek" },
            { num: STILL_IN, label: "Still In" },
            { num: TOTAL, label: "Entered" },
          ].map((cell, i) => (
            <div key={i} className={`px-5 py-2.5 text-center ${i < 2 ? "border-r border-line" : ""}`}>
              <div className="font-mono text-[22px] font-bold text-accent">{cell.num}</div>
              <div className="text-[10px] tracking-[1.5px] text-text-dim uppercase mt-0.5">{cell.label}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2.5 mt-5">
          <GhostButton className="px-4 py-2 text-[13px]" disabled>
            How it works
          </GhostButton>
          <Link
            href="/demo/standings"
            className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
          >
            Standings
          </Link>
          <GhostButton className="px-4 py-2 text-[13px]" disabled>
            Demo
          </GhostButton>
          <Link
            href="/demo/admin"
            className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
          >
            Admin
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 text-[13px] text-text-dim">
        <span>
          Logged in as <strong className="text-text">Jordan Blake</strong>
        </span>
        <GhostButton className="px-3 py-1.5 text-[11px]" disabled>
          Log out
        </GhostButton>
      </div>

      <Panel>
        <div className="flex justify-between items-center mb-3">
          <PanelTitle>Fixtures</PanelTitle>
          <select
            disabled
            className="bg-bg-deep border border-line-strong text-text text-[13px] font-semibold rounded-lg px-3 py-1.5"
          >
            <option>Gameweek {CURRENT_GW}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          {FIXTURES.map((f, i) => {
            const isOpen = expanded === i;
            const label = fixtureStatusLabel(f.status);
            const hasScore = f.homeScore !== null && f.awayScore !== null;
            return (
              <div key={i} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex justify-between items-center gap-3 text-left"
                >
                  <div>
                    <div className="font-semibold">
                      {f.home} <span className="text-text-dim font-normal">v</span> {f.away}
                    </div>
                    {hasScore ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-bold text-text">
                            {f.homeScore} - {f.awayScore}
                          </span>
                          {label && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                              {label}
                            </span>
                          )}
                        </div>
                        {(f.homeScorers.length > 0 || f.awayScorers.length > 0) && (
                          <div className="text-[11px] text-text-dim mt-1 flex flex-col gap-0.5">
                            {f.homeScorers.length > 0 && <div>⚽ {f.homeScorers.join(", ")}</div>}
                            {f.awayScorers.length > 0 && <div>⚽ {f.awayScorers.join(", ")}</div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11.5px] text-text-dim">{f.kickoff}</div>
                    )}
                  </div>
                  <span className="text-accent text-[11px] font-semibold whitespace-nowrap">
                    {isOpen ? "Hide threats ▲" : "Key threats ▾"}
                  </span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-line">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-dim mb-1.5">
                        {f.home}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {f.homeThreats.map((p) => (
                          <div key={p.name} className="text-[12.5px]">
                            {p.name} <span className="text-text-dim">· {p.pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-dim mb-1.5">
                        {f.away}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {f.awayThreats.map((p) => (
                          <div key={p.name} className="text-[12.5px]">
                            {p.name} <span className="text-text-dim">· {p.pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <a
          href="https://www.premierleague.com"
          target="_blank"
          rel="noopener"
          className="inline-block mt-3.5 text-[12.5px] text-accent border-b border-dotted border-accent no-underline"
        >
          Check live scores on premierleague.com ↗
        </a>
      </Panel>

      <Panel>
        <PanelTitle>Picks locked — GW{CURRENT_GW}</PanelTitle>
        <div className="flex gap-2 flex-wrap">
          <span className="text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
            FWD · Alexander Isak
          </span>
          <span className="text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
            MID · Mohamed Salah
          </span>
          <span className="text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
            DEF · Virgil van Dijk
          </span>
        </div>
        <Sub>
          <span className="block mt-3.5">Waiting on the admin to log this gameweek&apos;s results.</span>
        </Sub>
      </Panel>

      <Panel>
        <PanelTitle>Your picks so far</PanelTitle>
        <div className="flex flex-col gap-2">
          {[...YOUR_HISTORY].reverse().map((h) => (
            <div key={h.gw} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-dim mb-1.5">
                Gameweek {h.gw}
              </div>
              <div className="flex gap-2 flex-wrap">
                <DemoChip label="FWD" name={h.forward} scored={h.forwardScored} />
                <DemoChip label="MID" name={h.midfielder} scored={h.midfielderScored} />
                <DemoChip label="DEF" name={h.defender} scored={h.defenderScored} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Standings</PanelTitle>
        <Sub>
          A quick look —{" "}
          <Link href="/demo/standings" className="text-accent underline">
            the full breakdown
          </Link>{" "}
          lives on the Standings page.
        </Sub>
        <div className="flex flex-col gap-2">
          {alive.map((p) => (
            <div
              key={p.name}
              className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3"
            >
              <div>
                <div className="font-semibold">
                  {p.name}
                  {p.name === "Jordan Blake" && <span className="text-text-dim font-normal"> (you)</span>}
                </div>
                <div className="font-mono text-[11.5px] text-text-dim">
                  Survived {p.survivedThrough} gameweek{p.survivedThrough === 1 ? "" : "s"}
                </div>
              </div>
              <Badge tone="alive">Alive</Badge>
            </div>
          ))}
          {out.map((p) => (
            <div
              key={p.name}
              className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 opacity-[0.55]"
            >
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="font-mono text-[11.5px] text-text-dim">Out in gameweek {p.eliminatedGW}</div>
              </div>
              <Badge tone="out">Eliminated</Badge>
            </div>
          ))}
        </div>
      </Panel>

      {alive.length === 0 && <EmptyNote>Everyone&apos;s out — the pool would end here.</EmptyNote>}

      <div className="text-center mt-8">
        <Link href="/players" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to the real app
        </Link>
      </div>

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI&apos;S LAST MAN STANDING · one net, three shots, no excuses · DEMO DATA
      </footer>
    </div>
  );
}

function DemoChip({ label, name, scored }: { label: string; name: string; scored: boolean }) {
  return (
    <span
      className={`text-[12px] px-2.5 py-1.5 rounded-md border ${
        scored
          ? "bg-green-alive/10 border-green-alive/30 text-green-alive"
          : "bg-bg-deep border-line text-text-dim"
      }`}
    >
      {label} · {name}
      {scored ? " ⚽" : ""}
    </span>
  );
}
