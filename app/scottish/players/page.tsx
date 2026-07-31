"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, Badge, EmptyNote, LoadingScreen, Modal } from "@/components/ui";
import { ChangePinPanel } from "@/components/change-pin-panel";
import { POSITIONS, PositionKey } from "@/lib/data";
import type { StateResponse, Fixture, LivePlayer, PickHistoryEntry } from "@/lib/types";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fixtureStatusLabel(status: string | null | undefined): string | null {
  switch (status) {
    case "FINISHED":
      return "FT";
    case "IN_PLAY":
      return "Live";
    case "PAUSED":
      return "HT";
    case "POSTPONED":
      return "Postponed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return null;
  }
}

function formatKickoff(kickoff: string | null) {
  if (!kickoff) return "Kick-off TBC";
  return new Date(kickoff).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScottishPlayersPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [fixturesOpen, setFixturesOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api("/api/scot-state");
    setState(data);
  }, []);

  useEffect(() => {
    const loadPlayers = api("/api/scot-players")
      .then((d) => setPlayers(d.players))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), loadPlayers, wait(1500)]).finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="max-w-[760px] mx-auto px-4">
        <LoadingScreen label="Fetching this gameweek's picks…" />
      </div>
    );
  }
  if (!state) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-10 text-text-dim text-sm">
        Couldn&apos;t load the pool. Refresh to try again.
      </div>
    );
  }

  const { gameState, participants: allParticipants, me } = state;
  const participants = allParticipants.filter((p) => p.canPlayPlayers);
  const alive = participants.filter((p) => p.status !== "eliminated");

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-24 pt-7">
      <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-6 text-[13px] text-center">
        🏴 Trial weekend — Scottish Premiership. Fixtures &amp; scorer suggestions are synced from
        TheSportsDB; pick your squad by team below.
      </div>

      <Hero
        gameState={gameState}
        aliveCount={alive.length}
        total={participants.length}
        onHowItWorks={() => setHowItWorksOpen(true)}
        onFixtures={() => setFixturesOpen(true)}
      />

      <Modal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)}>
        <HowItWorks />
      </Modal>

      <Modal open={fixturesOpen} onClose={() => setFixturesOpen(false)}>
        <FixturesPanel currentGW={gameState.currentGW} />
      </Modal>

      {me && (
        <div className="flex justify-between items-center mb-4 text-[13px] text-text-dim">
          <span>
            Logged in as <strong className="text-text">{me.name}</strong>
          </span>
          <div className="flex items-center gap-2">
            <GhostButton className="px-3 py-1.5 text-[11px]" onClick={() => setPinModalOpen(true)}>
              🔑 Change PIN
            </GhostButton>
            <GhostButton
              className="px-3 py-1.5 text-[11px]"
              onClick={async () => {
                await api("/api/logout", { method: "POST" });
                refresh();
              }}
            >
              🚪 Log out
            </GhostButton>
          </div>
        </div>
      )}

      <Modal open={pinModalOpen} onClose={() => setPinModalOpen(false)}>
        <ChangePinPanel onClose={() => setPinModalOpen(false)} />
      </Modal>

      {gameState.phase === "finished" && <WinnerBanner alive={alive} gw={gameState.currentGW} />}

      {!me && (
        <Panel>
          <PanelTitle>{participants.length === 0 ? "No players yet" : "Log in required"}</PanelTitle>
          <Sub>
            {participants.length === 0 ? (
              <>
                The admin needs to add players before anyone can log in. Head to{" "}
                <Link href="/admin" className="text-accent underline">
                  /admin
                </Link>{" "}
                to add the group and hand out codes.
              </>
            ) : (
              <>
                Head back to the{" "}
                <Link href="/" className="text-accent underline">
                  home page
                </Link>{" "}
                to log in with your 4-digit code.
              </>
            )}
          </Sub>
        </Panel>
      )}

      {me && !me.canPlayPlayers && (
        <Panel>
          <PanelTitle>Not in this pool</PanelTitle>
          <Sub>
            The admin hasn&apos;t added you to the Scottish trial. Head back to the{" "}
            <Link href="/" className="text-accent underline">
              home page
            </Link>{" "}
            to see what you can play.
          </Sub>
        </Panel>
      )}

      {me && me.canPlayPlayers && gameState.phase !== "finished" && (
        <PickZone me={me} gameState={gameState} players={players} onDone={refresh} />
      )}

      {me && me.canPlayPlayers && <PickHistoryPanel history={me.history} />}

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI&apos;S LAST MAN STANDING · one net, three shots, no excuses
        <br />
        Created by Samuel Bowater
      </footer>
    </div>
  );
}

function Hero({
  gameState,
  aliveCount,
  total,
  onHowItWorks,
  onFixtures,
}: {
  gameState: StateResponse["gameState"];
  aliveCount: number;
  total: number;
  onHowItWorks: () => void;
  onFixtures: () => void;
}) {
  return (
    <div className="text-center pb-6 mb-6 border-b border-line">
      <Link
        href="/"
        className="inline-block font-mono text-[11px] text-text-dim hover:text-accent mb-3"
      >
        ← All games
      </Link>
      <div className="font-mono text-[12px] tracking-[3px] uppercase text-accent mb-2.5">
        🏴 Scottish Premiership Trial
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
          { num: String(gameState.currentGW).padStart(2, "0"), label: "Gameweek" },
          { num: aliveCount, label: "Still In" },
          { num: total, label: "Entered" },
        ].map((cell, i) => (
          <div key={i} className={`px-5 py-2.5 text-center ${i < 2 ? "border-r border-line" : ""}`}>
            <div className="font-mono text-[22px] font-bold text-accent">{cell.num}</div>
            <div className="text-[10px] tracking-[1.5px] text-text-dim uppercase mt-0.5">{cell.label}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2.5 mt-5 flex-wrap">
        <GhostButton onClick={onHowItWorks} className="px-4 py-2 text-[13px]">
          📖 How it works
        </GhostButton>
        <GhostButton onClick={onFixtures} className="px-4 py-2 text-[13px]">
          📅 Fixtures
        </GhostButton>
        <Link
          href="/scottish/players/standings"
          className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
        >
          📊 Standings
        </Link>
        <Link
          href="/scottish/players/admin"
          className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
        >
          🛠️ Admin
        </Link>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Pick Your Players",
      body: "Every gameweek, type in one Forward, one Midfielder and one Defender from the Scottish Premiership.",
    },
    {
      title: "Survive the Gameweek",
      body: "As long as at least one of your three finds the net, you live to fight another week.",
    },
    {
      title: "No Repeats",
      body: "Once you've picked a player, they're off the table for the rest of the trial.",
    },
    {
      title: "Be the Last Man Standing",
      body: "Keep surviving gameweek after gameweek — whoever's left standing at the end wins the whole pool.",
    },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl mb-4 text-text">How it works</h2>
      <div className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-3.5">
            <div className="w-8 h-8 min-w-8 rounded-full bg-accent text-white flex items-center justify-center font-display text-[15px]">
              {i + 1}
            </div>
            <div>
              <div className="font-semibold text-text mb-0.5">{step.title}</div>
              <div className="text-text-dim text-[13.5px] leading-relaxed">{step.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinnerBanner({ alive, gw }: { alive: StateResponse["participants"]; gw: number }) {
  const won = alive.length === 1;
  return (
    <div
      className="text-center py-7 px-4 rounded-[10px] mb-5 border"
      style={{
        borderColor: won ? "var(--accent)" : "var(--red)",
        background: won
          ? "radial-gradient(circle at center, rgba(13,148,136,0.12), transparent 70%)"
          : "transparent",
      }}
    >
      <div className="text-[34px]">{won ? "🏆" : "💥"}</div>
      <h2 className="font-display text-[26px] mt-2 mb-1">
        {won ? `${alive[0].name} wins it all` : "Total wipeout"}
      </h2>
      <p className="text-text-dim text-[13.5px]">
        {won
          ? `Last Man Standing after ${gw} gameweek${gw === 1 ? "" : "s"}. Everyone else got shut out.`
          : `Nobody's scorers came through in gameweek ${gw}. The trial ends with no survivor.`}
      </p>
    </div>
  );
}

function FixtureStatusLine({ fixture }: { fixture: Fixture }) {
  const label = fixtureStatusLabel(fixture.status);
  const hasScore =
    fixture.homeScore !== null &&
    fixture.homeScore !== undefined &&
    fixture.awayScore !== null &&
    fixture.awayScore !== undefined;

  if (hasScore) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-bold text-text">
          {fixture.homeScore} - {fixture.awayScore}
        </span>
        {label && <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">{label}</span>}
      </div>
    );
  }

  if (label) {
    return <div className="text-[11.5px] text-red">{label}</div>;
  }

  return <div className="text-[11.5px] text-text-dim">{formatKickoff(fixture.kickoff)}</div>;
}

function FixturesPanel({ currentGW }: { currentGW: number }) {
  const [selectedGW, setSelectedGW] = useState(currentGW);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedGW(currentGW);
  }, [currentGW]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/scot-fixtures?gw=${selectedGW}`).then((data) => {
      if (cancelled) return;
      setFixtures(data.fixtures);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedGW]);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <PanelTitle>Fixtures</PanelTitle>
        <select
          value={selectedGW}
          onChange={(e) => setSelectedGW(Number(e.target.value))}
          className="bg-bg-deep border border-line-strong text-text text-[13px] font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
        >
          {Array.from({ length: 38 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Gameweek {i + 1}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <EmptyNote>Loading fixtures…</EmptyNote>
      ) : fixtures.length === 0 ? (
        <EmptyNote>
          No fixtures synced for this gameweek yet — the admin needs to hit &quot;Sync fixtures &amp;
          scorers&quot; on the admin page.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {fixtures.map((f, i) => (
            <div key={i} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3">
              <div className="font-semibold">
                {f.home} <span className="text-text-dim font-normal">v</span> {f.away}
              </div>
              <FixtureStatusLine fixture={f} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PickZone({
  me,
  gameState,
  players,
  onDone,
}: {
  me: NonNullable<StateResponse["me"]>;
  gameState: StateResponse["gameState"];
  players: LivePlayer[];
  onDone: () => void;
}) {
  if (me.status === "eliminated") {
    return (
      <Panel>
        <PanelTitle>You&apos;re out</PanelTitle>
        <div className="flex items-center justify-between gap-3.5 mb-3">
          <div className="text-lg font-bold">{me.name}</div>
          <Badge tone="out">Eliminated · GW{me.eliminatedGW}</Badge>
        </div>
        <Sub>
          None of your three found the net in gameweek {me.eliminatedGW}. Stick around and watch
          the rest of the pool play out below.
        </Sub>
      </Panel>
    );
  }

  const locked = gameState.pickDeadline
    ? Date.now() >= new Date(gameState.pickDeadline).getTime()
    : false;

  if (locked) {
    if (me.pick) {
      return (
        <Panel>
          <PanelTitle>Picks locked — GW{gameState.currentGW}</PanelTitle>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
              FWD · {me.pick.forward}
            </span>
            <span className="text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
              MID · {me.pick.midfielder}
            </span>
            <span className="text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
              DEF · {me.pick.defender}
            </span>
          </div>
          <Sub>
            <span className="block mt-3.5">Waiting on the admin to log this gameweek&apos;s results.</span>
          </Sub>
        </Panel>
      );
    }
    return (
      <Panel>
        <PanelTitle>Picks locked — GW{gameState.currentGW}</PanelTitle>
        <Sub>You didn&apos;t lock in a pick before kickoff this gameweek. Hang tight for results.</Sub>
      </Panel>
    );
  }

  return <PickForm me={me} gameState={gameState} players={players} onDone={onDone} />;
}

function PickHistoryPanel({ history }: { history: PickHistoryEntry[] }) {
  return (
    <Panel>
      <PanelTitle>Your picks so far</PanelTitle>
      {history.length === 0 ? (
        <EmptyNote>No previous picks to show just yet.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {[...history].reverse().map((h) => (
            <div key={h.gw} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-dim mb-1.5">
                Gameweek {h.gw}
              </div>
              <div className="flex gap-2 flex-wrap">
                <HistoryChip label="FWD" name={h.forward} scored={h.forwardScored} />
                <HistoryChip label="MID" name={h.midfielder} scored={h.midfielderScored} />
                <HistoryChip label="DEF" name={h.defender} scored={h.defenderScored} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function HistoryChip({ label, name, scored }: { label: string; name: string; scored: boolean | null }) {
  return (
    <span
      className={`text-[12px] px-2.5 py-1.5 rounded-md border ${
        scored
          ? "bg-green-alive/10 border-green-alive/30 text-green-alive"
          : scored === false
            ? "bg-bg-deep border-line text-text-dim"
            : "bg-bg-deep border-line text-text"
      }`}
    >
      {label} · {name}
      {scored ? " ⚽" : ""}
    </span>
  );
}

function PlayerPicker({
  value,
  onChange,
  candidates,
}: {
  value: string;
  onChange: (v: string) => void;
  candidates: LivePlayer[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groups = useMemo(() => {
    const byTeam = new Map<string, LivePlayer[]>();
    for (const p of candidates) {
      const team = p.team || "Unknown club";
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push(p);
    }
    return Array.from(byTeam.entries())
      .map(([team, teamPlayers]) => ({
        team,
        players: [...teamPlayers].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.team.localeCompare(b.team));
  }, [candidates]);

  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? groups
        .map((g) => ({
          team: g.team,
          players: g.team.toLowerCase().includes(q)
            ? g.players
            : g.players.filter((p) => p.name.toLowerCase().includes(q)),
        }))
        .filter((g) => g.players.length > 0)
    : groups;

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center gap-2 bg-bg-deep border border-line-strong text-text rounded-lg px-3.5 py-3 text-[15px] text-left focus:outline-none focus:border-accent"
      >
        <span className={value ? "truncate" : "truncate text-[#9fb3ab]"}>
          {value || "Select a team, then a player…"}
        </span>
        <span className="text-text-dim text-[11px] shrink-0">{open ? "▲" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-panel border border-line-strong rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-line">
            <input
              autoComplete="off"
              autoFocus
              placeholder="Search team or player…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-bg-deep border border-line-strong text-text placeholder:text-[#9fb3ab] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-3.5 py-3 text-[13px] text-text-dim">No matches.</div>
            ) : (
              filteredGroups.map((g) => {
                const isExpanded = q ? true : expandedTeam === g.team;
                return (
                  <div key={g.team} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setExpandedTeam((old) => (old === g.team ? null : g.team))}
                      className="w-full flex justify-between items-center gap-2 px-3.5 py-2.5 text-left hover:bg-bg-deep transition font-semibold text-[13px]"
                    >
                      <span>{g.team}</span>
                      <span className="text-text-dim text-[11px]">
                        {isExpanded ? "▲" : `${g.players.length} ▾`}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="bg-bg-deep">
                        {g.players.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => select(p.name)}
                            className={`w-full flex items-center gap-2 pl-7 pr-3.5 py-2 text-left hover:bg-panel transition text-[13px] ${
                              p.name === value ? "text-accent font-medium" : "text-text"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PickForm({
  me,
  gameState,
  players,
  onDone,
}: {
  me: NonNullable<StateResponse["me"]>;
  gameState: StateResponse["gameState"];
  players: LivePlayer[];
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<PositionKey, string>>({
    forward: me.pick?.forward || "",
    midfielder: me.pick?.midfielder || "",
    defender: me.pick?.defender || "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const filled = Object.values(values).every((v) => v.trim().length > 0);
  const used = new Set(me.usedPlayers);

  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/scot-picks", { method: "POST", body: JSON.stringify(values) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function clear() {
    if (!confirm("Clear your picks for this gameweek? You'll need to pick again before the deadline.")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/scot-picks", { method: "DELETE" });
      setValues({ forward: "", midfielder: "", defender: "" });
      setNotice("Your picks have been cleared for this gameweek.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="bg-panel border border-line rounded-[10px] mb-5">
      <div className="px-5 pt-5">
        <PanelTitle>Your picks — Gameweek {gameState.currentGW}</PanelTitle>
        <Sub>
          Each player can only be picked once all trial.
          {gameState.pickDeadline && (
            <span className="block mt-1">
              You can change your picks until {formatKickoff(gameState.pickDeadline)}.
            </span>
          )}
        </Sub>
      </div>
      <div className="bg-bg-deep">
        {POSITIONS.map((pos) => {
          const isUsed = used.has(values[pos.key].trim().toLowerCase());
          const candidates = players.filter(
            (p) => p.position === pos.key && !used.has(p.name.toLowerCase())
          );
          return (
            <div key={pos.key} className="px-5 py-[18px] border-b border-line">
              <div className="font-mono text-[11px] tracking-[2px] text-accent uppercase">{pos.label}</div>
              <div className="text-text-dim text-[12.5px] my-1 mb-3">{pos.hint}</div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-[38px] h-[38px] min-w-[38px] rounded-full border-2 flex items-center justify-center font-display text-[15px] ${
                    values[pos.key] ? "border-accent text-accent" : "border-line-strong text-text-dim"
                  }`}
                >
                  {values[pos.key] ? "✓" : "?"}
                </div>
                <div className="flex-1">
                  {candidates.length > 0 ? (
                    <PlayerPicker
                      value={values[pos.key]}
                      onChange={(v) => setValues((old) => ({ ...old, [pos.key]: v }))}
                      candidates={candidates}
                    />
                  ) : (
                    <input
                      autoComplete="off"
                      placeholder={`Type a ${pos.label.toLowerCase()}'s name…`}
                      value={values[pos.key]}
                      onChange={(e) => setValues((old) => ({ ...old, [pos.key]: e.target.value }))}
                      className="w-full bg-bg-deep border border-line-strong text-text placeholder:text-[#9fb3ab] rounded-lg px-3.5 py-3 text-[15px] focus:outline-none focus:border-accent"
                    />
                  )}
                  {isUsed && (
                    <div className="text-[11.5px] text-red mt-1.5">
                      You&apos;ve already picked this player in an earlier gameweek.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div className="px-5 py-4 bg-bg-deep rounded-b-[10px] flex flex-col items-end gap-2">
          {error && <div className="text-red text-[13px] self-stretch">{error}</div>}
          {notice && <div className="text-green-alive text-[13px] self-stretch">✅ {notice}</div>}
          <div className="flex gap-2.5">
            {me.pick && (
              <DangerButton disabled={busy} onClick={clear}>
                🗑️ Clear picks
              </DangerButton>
            )}
            <PrimaryButton disabled={!filled || busy} onClick={submit}>
              {busy ? "Saving…" : me.pick ? "✅ Update picks" : "🔒 Lock in picks"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
