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
  const [liveStatus, setLiveStatus] = useState<Record<string, "scored" | "no_goal" | "in_progress"> | null>(null);

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

  // Before the admin logs official results, borrow the same live FPL feed used
  // on the picks page so scorers still show up green here instead of everyone
  // looking neutral until results are applied.
  useEffect(() => {
    if (!report || report.resolved || !report.picksVisible || report.gw !== report.currentGW) {
      setLiveStatus(null);
      return;
    }
    let cancelled = false;
    api("/api/live-scorers")
      .then((res) => {
        if (!cancelled && res.ok) {
          const lowered: Record<string, "scored" | "no_goal" | "in_progress"> = {};
          for (const [name, status] of Object.entries(
            res.players as Record<string, "scored" | "no_goal" | "in_progress">
          )) {
            lowered[name.toLowerCase()] = status;
          }
          setLiveStatus(lowered);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [report]);

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
              ) : report.picksVisible ? (
                <>
                  Picks are locked for gameweek {gw} — waiting on the admin to log results.
                  {liveStatus && " Colours below are live and may lag or change until then."}
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
                      <PickCell revealed={report.picksVisible} name={p.forward} team={p.forwardTeam} scored={p.forwardScored} submitted={p.submitted} liveStatus={liveStatus} />
                      <PickCell revealed={report.picksVisible} name={p.midfielder} team={p.midfielderTeam} scored={p.midfielderScored} submitted={p.submitted} liveStatus={liveStatus} />
                      <PickCell revealed={report.picksVisible} name={p.defender} team={p.defenderTeam} scored={p.defenderScored} submitted={p.submitted} liveStatus={liveStatus} />
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
          (report.picksVisible && report.topPicks ? (
            <div className="grid sm:grid-cols-3 gap-5">
              <TopPickColumn title="Forwards" picks={report.topPicks.forward} resolved={report.resolved} liveStatus={liveStatus} />
              <TopPickColumn title="Midfielders" picks={report.topPicks.midfielder} resolved={report.resolved} liveStatus={liveStatus} />
              <TopPickColumn title="Defenders" picks={report.topPicks.defender} resolved={report.resolved} liveStatus={liveStatus} />
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
  revealed,
  name,
  team,
  scored,
  submitted,
  liveStatus,
}: {
  revealed: boolean;
  name: string | null;
  team: string | null;
  scored: boolean | null;
  submitted: boolean;
  liveStatus: Record<string, "scored" | "no_goal" | "in_progress"> | null;
}) {
  if (!revealed) {
    return (
      <td className="py-2.5 pr-3 whitespace-nowrap text-text-dim">{submitted ? "🔒 Submitted" : "-"}</td>
    );
  }
  if (!name) {
    return <td className="py-2.5 pr-3 whitespace-nowrap text-text-dim">-</td>;
  }

  // Official scored status (from applied results) always wins once it exists.
  // Before that, fall back to the live feed so scorers still show up green —
  // "no live entry yet" means their match hasn't kicked off, and "no goal" only
  // shows red once their match has actually finished.
  const live = scored === null && liveStatus ? liveStatus[name.toLowerCase()] : undefined;
  const isScored = scored === true || live === "scored";
  const note =
    scored === null && liveStatus
      ? live === "in_progress"
        ? "Match in progress"
        : !live
          ? "Not started yet"
          : null
      : null;

  return (
    <td className="py-2.5 pr-3 whitespace-nowrap">
      <div
        className={
          isScored
            ? "text-green-alive font-semibold"
            : live === "no_goal"
              ? "text-red"
              : undefined
        }
      >
        {name}
        {isScored ? " ⚽" : live === "no_goal" ? " ❌" : ""}
      </div>
      {team && <div className="text-[10.5px] text-text-dim font-normal">{team}</div>}
      {note && <div className="text-[10px] text-text-dim">{note}</div>}
    </td>
  );
}

function TopPickColumn({
  title,
  picks,
  resolved,
  liveStatus,
}: {
  title: string;
  picks: TopPick[];
  resolved: boolean;
  liveStatus: Record<string, "scored" | "no_goal" | "in_progress"> | null;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-dim mb-2.5">{title}</div>
      {picks.length === 0 ? (
        <div className="text-[12.5px] text-text-dim">No picks recorded.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {picks.map((p, i) => {
            const live = !resolved && liveStatus ? liveStatus[p.name.toLowerCase()] : undefined;
            const isScored = p.scored || live === "scored";
            const note =
              !resolved && liveStatus
                ? live === "in_progress"
                  ? "Match in progress"
                  : !live
                    ? "Not started yet"
                    : null
                : null;
            return (
              <div
                key={p.name}
                className="flex justify-between items-center gap-2 bg-bg-deep border border-line rounded-lg px-3 py-2"
              >
                <div>
                  <span
                    className={`text-[13px] ${
                      isScored ? "text-green-alive font-semibold" : live === "no_goal" ? "text-red" : ""
                    }`}
                  >
                    <span className="text-accent font-semibold">#{i + 1}</span> {p.name}
                    {isScored ? " ⚽" : live === "no_goal" ? " ❌" : ""}
                  </span>
                  {note && <div className="text-[10px] text-text-dim ml-4">{note}</div>}
                </div>
                <span className="text-[11px] text-text-dim whitespace-nowrap">
                  {p.picks} pick{p.picks === 1 ? "" : "s"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
