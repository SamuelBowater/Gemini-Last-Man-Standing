"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Badge, EmptyNote, LoadingScreen } from "@/components/ui";
import type { GameweekReport, TopPick } from "@/lib/types";

async function api(path: string) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toCSV(report: GameweekReport): string {
  const header = ["Player", "Forward", "Midfielder", "Defender", "Status"];
  const lines = report.players.map((p) => [
    p.name,
    p.forward || "",
    p.midfielder || "",
    p.defender || "",
    p.overallStatus === "eliminated" ? "Eliminated" : "Active",
  ]);
  return [header, ...lines].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function downloadCSV(report: GameweekReport) {
  const blob = new Blob([toCSV(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gameweek-${report.gw}-selections.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StandingsPage() {
  const [report, setReport] = useState<GameweekReport | null>(null);
  const [gw, setGw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"selections" | "topPicks">("selections");

  const load = useCallback((targetGw?: number) => {
    return api(`/api/gameweek${targetGw ? `?gw=${targetGw}` : ""}`).then((data: GameweekReport) => {
      setReport(data);
      setGw(data.gw);
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load().finally(() => setLoading(false));
  }, [load]);

  function changeGW(newGw: number) {
    setLoading(true);
    load(newGw).finally(() => setLoading(false));
  }

  if (loading || !report || gw === null) {
    return (
      <div className="max-w-[880px] mx-auto px-4">
        <LoadingScreen label="Loading standings…" />
      </div>
    );
  }

  return (
    <div className="max-w-[880px] mx-auto px-4 pb-24 pt-7">
      <Link href="/players" className="text-text-dim text-[12px] font-mono hover:text-accent">
        ← Back to home
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
              onChange={(e) => changeGW(Number(e.target.value))}
              className="bg-bg-deep border border-line-strong text-text text-[13px] font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              {Array.from({ length: report.currentGW }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Gameweek {n}
                  {n === report.currentGW ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>
          {report.resolved && (
            <button
              onClick={() => downloadCSV(report)}
              className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition"
            >
              Download CSV
            </button>
          )}
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
                  Gameweek {gw} hasn&apos;t been resolved yet — picks stay hidden until the
                  admin logs results, to keep things fair.
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
                  {report.players.map((p) => (
                    <tr key={p.id} className="border-b border-line">
                      <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{p.name}</td>
                      <PickCell resolved={report.resolved} name={p.forward} scored={p.forwardScored} submitted={p.submitted} />
                      <PickCell resolved={report.resolved} name={p.midfielder} scored={p.midfielderScored} submitted={p.submitted} />
                      <PickCell resolved={report.resolved} name={p.defender} scored={p.defenderScored} submitted={p.submitted} />
                      <td className="py-2.5">
                        <Badge tone={p.overallStatus === "eliminated" ? "out" : "alive"}>
                          {p.overallStatus === "eliminated" ? "Eliminated" : "Active"}
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
              <TopPickColumn title="Forwards" picks={report.topPicks.forward} />
              <TopPickColumn title="Midfielders" picks={report.topPicks.midfielder} />
              <TopPickColumn title="Defenders" picks={report.topPicks.defender} />
            </div>
          ) : (
            <EmptyNote>
              Top picks reveal once gameweek {gw} is resolved by the admin.
            </EmptyNote>
          ))}
      </Panel>
    </div>
  );
}

function PickCell({
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

function TopPickColumn({ title, picks }: { title: string; picks: TopPick[] }) {
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
