"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Badge, EmptyNote, LoadingScreen } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import type { TeamGameweekReport, TeamTopPick } from "@/lib/team-types";

async function api(path: string) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toCSV(report: TeamGameweekReport): string {
  const header = ["Player", "Team", "Result", "Status"];
  const lines = report.rows.map((r) => [
    r.name,
    r.team || "",
    r.result || "",
    r.overallStatus === "eliminated" ? "Eliminated" : "Active",
  ]);
  return [header, ...lines].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function downloadCSV(report: TeamGameweekReport) {
  const blob = new Blob([toCSV(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `team-survival-gameweek-${report.gw}-selections.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TeamStandingsPage() {
  const [report, setReport] = useState<TeamGameweekReport | null>(null);
  const [gw, setGw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"selections" | "topPicks">("selections");

  const load = useCallback((targetGw?: number) => {
    return api(`/api/team-gameweek${targetGw ? `?gw=${targetGw}` : ""}`).then((data: TeamGameweekReport) => {
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
      <Link href="/teams" className="text-text-dim text-[12px] font-mono hover:text-accent">
        ← Back to Team Survival
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
              {t === "selections" ? "Selections" : "Most Picked"}
            </button>
          ))}
        </div>

        {tab === "selections" && (
          <>
            <div className="text-[12.5px] text-text-dim mb-3">
              {report.resolved ? (
                <>
                  Winning teams:{" "}
                  {report.winningTeams.length > 0 ? report.winningTeams.map(titleCase).join(", ") : "Nobody won."}
                </>
              ) : report.picksVisible ? (
                <>Picks are locked for gameweek {gw} — waiting on the admin to log results.</>
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
                    <th className="py-2 pr-3">Team</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.id} className="border-b border-line">
                      <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{r.name}</td>
                      <PickCell revealed={report.picksVisible} team={r.team} result={r.result} submitted={r.submitted} />
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
          (report.picksVisible && report.topPicks ? (
            <TopPickList picks={report.topPicks} />
          ) : (
            <EmptyNote>
              Most picked teams reveal once gameweek {gw} is resolved by the admin.
            </EmptyNote>
          ))}
      </Panel>
    </div>
  );
}

function PickCell({
  revealed,
  team,
  result,
  submitted,
}: {
  revealed: boolean;
  team: string | null;
  result: TeamGameweekReport["rows"][number]["result"];
  submitted: boolean;
}) {
  if (!revealed) {
    return (
      <td className="py-2.5 pr-3 whitespace-nowrap text-text-dim">{submitted ? "🔒 Submitted" : "-"}</td>
    );
  }
  if (!team) {
    return <td className="py-2.5 pr-3 whitespace-nowrap text-text-dim">-</td>;
  }
  const suffix = result === "win" ? " ✓" : result === "draw" ? " (draw)" : result === "loss" ? " (lost)" : "";
  return (
    <td className="py-2.5 pr-3 whitespace-nowrap">
      <span className={`inline-flex items-center gap-1.5 ${result === "win" ? "text-green-alive font-semibold" : ""}`}>
        <TeamBadge team={team} size={18} />
        {team}
        {suffix}
      </span>
    </td>
  );
}

function TopPickList({ picks }: { picks: TeamTopPick[] }) {
  if (picks.length === 0) {
    return <div className="text-[12.5px] text-text-dim">No picks recorded.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {picks.map((p, i) => (
        <div
          key={p.team}
          className="flex justify-between items-center gap-2 bg-bg-deep border border-line rounded-lg px-3 py-2"
        >
          <span className={`text-[13px] flex items-center gap-1.5 ${p.result === "win" ? "text-green-alive font-semibold" : ""}`}>
            <span className="text-accent font-semibold">#{i + 1}</span>
            <TeamBadge team={p.team} size={18} />
            {p.team}
            {p.result === "win" ? " ✓" : ""}
          </span>
          <span className="text-[11px] text-text-dim whitespace-nowrap">
            {p.picks} pick{p.picks === 1 ? "" : "s"}
          </span>
        </div>
      ))}
    </div>
  );
}
