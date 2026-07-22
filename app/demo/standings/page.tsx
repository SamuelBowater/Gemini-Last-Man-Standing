"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Badge, EmptyNote } from "@/components/ui";
import { CURRENT_GW, buildReport, titleCase, type DemoTopPick } from "@/lib/demoData";

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
