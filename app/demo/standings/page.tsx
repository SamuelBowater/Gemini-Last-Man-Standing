"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Badge, EmptyNote } from "@/components/ui";

type Position = "forward" | "midfielder" | "defender";

interface DemoPick {
  forward: string;
  midfielder: string;
  defender: string;
}

const ELIMINATED_GW: Record<string, number | null> = {
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

const PARTICIPANT_ORDER = Object.keys(ELIMINATED_GW);
const CURRENT_GW = 5;

// The single source of truth for who scored each gameweek — a pick "scores"
// if the player's name appears here, so every participant who picked the
// same player automatically agrees on the outcome (no hand-authored conflicts).
const SCORERS: Record<number, string[]> = {
  1: ["erling haaland", "bukayo saka", "josko gvardiol", "viktor gyökeres", "bryan mbeumo", "jarrod bowen"],
  2: ["bukayo saka", "ollie watkins", "morgan rogers", "antoine semenyo", "dominic solanke", "jean-philippe mateta"],
  3: ["josko gvardiol", "milos kerkez", "levi colwill", "jarrod bowen", "william saliba"],
  4: ["viktor gyökeres", "mohamed salah", "martin odegaard", "trent alexander-arnold"],
};

const PICKS: Record<number, Record<string, DemoPick>> = {
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

const SUBMITTED_GW5 = new Set(["Jordan Blake", "Priya Shah", "Sam Ostrowski", "Alex Morgan", "Deja Whitfield"]);

interface DemoRow {
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

interface DemoTopPick {
  name: string;
  picks: number;
  scored: boolean;
}

function buildReport(gw: number) {
  const resolved = gw < CURRENT_GW;
  const scorerSet = new Set(SCORERS[gw] || []);
  const scored = (name: string | null) => (name ? scorerSet.has(name.toLowerCase()) : false);

  const rows: DemoRow[] = PARTICIPANT_ORDER.map((name) => {
    const elimGW = ELIMINATED_GW[name];
    const overallStatus: "alive" | "eliminated" = elimGW === null ? "alive" : "eliminated";
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

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DemoStandingsPage() {
  const [gw, setGw] = useState(CURRENT_GW);
  const [tab, setTab] = useState<"selections" | "topPicks">("selections");
  const report = buildReport(gw);

  return (
    <div className="max-w-[880px] mx-auto px-4 pb-24 pt-7">
      <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-6 text-[13px] text-center">
        This is a demo page with made-up players, scores and standings, showing roughly what
        the app looks like a few gameweeks into a season. It isn&apos;t connected to your real
        pool.{" "}
        <Link href="/demo" className="underline font-semibold">
          Back to the demo home →
        </Link>
      </div>

      <Link href="/demo" className="text-text-dim text-[12px] font-mono hover:text-accent">
        ← Back to demo home
      </Link>

      <h1 className="font-display text-[36px] mt-4 mb-6 text-text">Standings</h1>

      <Panel>
        <PanelTitle>Competition overview</PanelTitle>
        <div className="grid grid-cols-3 gap-3">
          {[
            { num: report.poolStats.total, label: "Total Players" },
            { num: report.poolStats.stillStanding, label: "Still Standing" },
            { num: report.poolStats.eliminated, label: "Eliminated" },
          ].map((cell) => (
            <div key={cell.label} className="bg-bg-deep border border-line rounded-xl py-4 text-center">
              <div className="font-display text-[28px] text-accent">{cell.num}</div>
              <div className="text-[10px] tracking-[1.5px] text-text-dim uppercase mt-0.5">{cell.label}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
          <div>
            <div className="text-[11px] text-text-dim uppercase tracking-wide mb-1">
              View gameweek selections
            </div>
            <select
              value={gw}
              onChange={(e) => setGw(Number(e.target.value))}
              className="bg-bg-deep border border-line-strong text-text text-[13px] font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              {Array.from({ length: CURRENT_GW }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Gameweek {n}
                  {n === CURRENT_GW ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inline-flex mb-4 border border-line-strong rounded-lg overflow-hidden">
          {(["selections", "topPicks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-[13px] font-semibold transition ${
                tab === t ? "bg-accent text-white" : "bg-transparent text-text-dim hover:text-text"
              }`}
            >
              {t === "selections" ? "Selections" : "Top Picks"}
            </button>
          ))}
        </div>

        {tab === "selections" && (
          <>
            <div className="text-[12.5px] text-text-dim mb-3">
              {report.resolved ? (
                <>
                  Scorers:{" "}
                  {report.scorers.length > 0 ? report.scorers.map(titleCase).join(", ") : "Nobody scored."}
                </>
              ) : (
                <>
                  Gameweek {gw} hasn&apos;t been resolved yet — picks stay hidden until the admin
                  logs results, to keep things fair.
                </>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-text-dim uppercase text-[10.5px] tracking-wide border-b border-line">
                    <th className="py-2 pr-3">Player</th>
                    <th className="py-2 pr-3">Forward</th>
                    <th className="py-2 pr-3">Midfielder</th>
                    <th className="py-2 pr-3">Defender</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.name} className="border-b border-line">
                      <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{r.name}</td>
                      <DemoPickCell resolved={report.resolved} name={r.forward} scored={r.forwardScored} submitted={r.submitted} />
                      <DemoPickCell resolved={report.resolved} name={r.midfielder} scored={r.midfielderScored} submitted={r.submitted} />
                      <DemoPickCell resolved={report.resolved} name={r.defender} scored={r.defenderScored} submitted={r.submitted} />
                      <td className="py-2.5">
                        <Badge tone={r.overallStatus === "eliminated" ? "out" : "alive"}>
                          {r.overallStatus === "eliminated" ? "Eliminated" : "Active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "topPicks" &&
          (report.resolved && report.topPicks ? (
            <div className="grid sm:grid-cols-3 gap-5">
              <DemoTopPickColumn title="Forwards" picks={report.topPicks.forward} />
              <DemoTopPickColumn title="Midfielders" picks={report.topPicks.midfielder} />
              <DemoTopPickColumn title="Defenders" picks={report.topPicks.defender} />
            </div>
          ) : (
            <EmptyNote>Top picks reveal once gameweek {gw} is resolved by the admin.</EmptyNote>
          ))}
      </Panel>

      <div className="text-center mt-8">
        <Link href="/demo" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to demo home
        </Link>
      </div>

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI&apos;S LAST MAN STANDING · DEMO DATA
      </footer>
    </div>
  );
}

function DemoPickCell({
  resolved,
  name,
  scored,
  submitted,
}: {
  resolved: boolean;
  name: string | null;
  scored: boolean | null;
  submitted: boolean;
}) {
  if (!resolved) {
    return (
      <td className="py-2.5 pr-3 whitespace-nowrap text-text-dim">{submitted ? "🔒 Submitted" : "-"}</td>
    );
  }
  if (!name) {
    return <td className="py-2.5 pr-3 whitespace-nowrap text-text-dim">-</td>;
  }
  return (
    <td className="py-2.5 pr-3 whitespace-nowrap">
      {name}
      {scored ? " ⚽" : ""}
    </td>
  );
}

function DemoTopPickColumn({ title, picks }: { title: string; picks: DemoTopPick[] }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-dim mb-2.5">{title}</div>
      {picks.length === 0 ? (
        <div className="text-[12.5px] text-text-dim">No picks recorded.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {picks.map((p, i) => (
            <div
              key={p.name}
              className="flex justify-between items-center gap-2 bg-bg-deep border border-line rounded-lg px-3 py-2"
            >
              <span className="text-[13px]">
                <span className="text-accent font-semibold">#{i + 1}</span> {p.name}
                {p.scored ? " ⚽" : ""}
              </span>
              <span className="text-[11px] text-text-dim whitespace-nowrap">
                {p.picks} pick{p.picks === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
