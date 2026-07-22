"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, TextInput, Badge, EmptyNote, LoadingScreen, Modal } from "@/components/ui";
import { POSITIONS, SUGGESTED, PositionKey } from "@/lib/data";
import { STATUS_LABEL, normalizeTeamName, type PlayerStatus } from "@/lib/players";
import type { StateResponse, Fixture, LivePlayer } from "@/lib/types";

const POSITION_SHORT: Record<PositionKey, string> = {
  forward: "FWD",
  midfielder: "MID",
  defender: "DEF",
};

function StatusPill({ status }: { status: PlayerStatus }) {
  if (status === "available") return null;
  const tones: Record<PlayerStatus, string> = {
    available: "",
    doubtful: "text-[#b45309] border-[#b45309]/30 bg-[#b45309]/10",
    injured: "text-red border-red/30 bg-red/10",
    suspended: "text-red border-red/30 bg-red/10",
    unavailable: "text-text-dim border-line-strong bg-bg-deep",
  };
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${tones[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

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

export default function Home() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api("/api/state");
    setState(data);
  }, []);

  useEffect(() => {
    const loadPlayers = api("/api/players")
      .then((d) => setPlayers(d.players))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), loadPlayers, wait(2000)]).finally(() => setLoading(false));
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

  const { gameState, participants, me } = state;
  const alive = participants.filter((p) => p.status !== "eliminated");
  const out = participants
    .filter((p) => p.status === "eliminated")
    .sort((a, b) => (b.eliminatedGW || 0) - (a.eliminatedGW || 0));

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-24 pt-7">
      <Hero
        gameState={gameState}
        aliveCount={alive.length}
        total={participants.length}
        onHowItWorks={() => setHowItWorksOpen(true)}
      />

      <Modal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)}>
        <HowItWorks />
      </Modal>

      {me && (
        <div className="flex justify-between items-center mb-4 text-[13px] text-text-dim">
          <span>
            Logged in as <strong className="text-text">{me.name}</strong>
          </span>
          <GhostButton
            className="px-3 py-1.5 text-[11px]"
            onClick={async () => {
              await api("/api/logout", { method: "POST" });
              refresh();
            }}
          >
            Log out
          </GhostButton>
        </div>
      )}

      <FixturesPanel currentGW={gameState.currentGW} players={players} />

      {gameState.phase === "finished" && <WinnerBanner alive={alive} gw={gameState.currentGW} />}

      {!me && participants.length === 0 && (
        <Panel>
          <PanelTitle>No players yet</PanelTitle>
          <Sub>
            The commissioner needs to add players before anyone can log in. Head to{" "}
            <Link href="/admin" className="text-accent underline">
              /admin
            </Link>{" "}
            to add the group and hand out codes.
          </Sub>
        </Panel>
      )}

      {!me && participants.length > 0 && <LoginPanel onSuccess={refresh} />}

      {me && gameState.phase !== "finished" && (
        <PickZone me={me} gameState={gameState} players={players} onDone={refresh} />
      )}

      <StandingsPanel alive={alive} out={out} gameState={gameState} myId={me?.id} />

      <div className="text-center mt-8">
        <Link href="/admin" className="text-text-dim text-[11px] font-mono hover:text-accent">
          Commissioner login →
        </Link>
      </div>

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI'S LAST MAN STANDING · one net, three shots, no excuses
      </footer>
    </div>
  );
}

function Hero({
  gameState,
  aliveCount,
  total,
  onHowItWorks,
}: {
  gameState: StateResponse["gameState"];
  aliveCount: number;
  total: number;
  onHowItWorks: () => void;
}) {
  return (
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
      <GhostButton onClick={onHowItWorks} className="mt-5 px-4 py-2 text-[13px]">
        How it works
      </GhostButton>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Pick Your Players",
      body: "Every gameweek, choose one Forward, one Midfielder and one Defender from the player pool.",
    },
    {
      title: "Survive the Gameweek",
      body: "As long as at least one of your three finds the net, you live to fight another week.",
    },
    {
      title: "No Repeats",
      body: "Once you've picked a player, they're off the table for the rest of the season.",
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
          : `Nobody's scorers came through in gameweek ${gw}. The pool ends with no survivor.`}
      </p>
    </div>
  );
}

function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (code.length !== 4) {
      setError("Enter all 4 digits.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({ code }) });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Log in</PanelTitle>
      <Sub>Enter the 4-digit code the commissioner gave you.</Sub>
      <div className="flex gap-2.5">
        <TextInput
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="0000"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <PrimaryButton onClick={submit} disabled={busy}>
          {busy ? "…" : "Log in"}
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
    </Panel>
  );
}

function FixturesPanel({ currentGW, players }: { currentGW: number; players: LivePlayer[] }) {
  const [selectedGW, setSelectedGW] = useState(currentGW);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [officialUrl, setOfficialUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setSelectedGW(currentGW);
  }, [currentGW]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExpanded(null);
    api(`/api/fixtures?gw=${selectedGW}`).then((data) => {
      if (cancelled) return;
      setFixtures(data.fixtures);
      setOfficialUrl(data.officialFixturesUrl);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedGW]);

  return (
    <Panel>
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
          No fixtures added for this gameweek yet — check back soon, or use the official link
          below.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {fixtures.map((f, i) => {
            const homeTeam = normalizeTeamName(f.home);
            const awayTeam = normalizeTeamName(f.away);
            const homeThreats = topThreatPerPosition(players, homeTeam);
            const awayThreats = topThreatPerPosition(players, awayTeam);
            const isOpen = expanded === i;
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
                    <div className="text-[11.5px] text-text-dim">{formatKickoff(f.kickoff)}</div>
                  </div>
                  <span className="text-accent text-[11px] font-semibold whitespace-nowrap">
                    {isOpen ? "Hide threats ▲" : "Key threats ▾"}
                  </span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-line">
                    <ThreatList label={f.home} players={homeThreats} />
                    <ThreatList label={f.away} players={awayThreats} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <a
        href={officialUrl}
        target="_blank"
        rel="noopener"
        className="inline-block mt-3.5 text-[12.5px] text-accent border-b border-dotted border-accent no-underline"
      >
        Check live scores on premierleague.com ↗
      </a>
    </Panel>
  );
}

function topThreatPerPosition(players: LivePlayer[], team: string): LivePlayer[] {
  const teamPlayers = players.filter((p) => p.team === team);
  return POSITIONS.map((pos) =>
    teamPlayers
      .filter((p) => p.position === pos.key)
      .sort((a, b) => b.threat - a.threat)[0]
  ).filter((p): p is LivePlayer => Boolean(p));
}

function ThreatList({ label, players }: { label: string; players: LivePlayer[] }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-dim mb-1.5">{label}</div>
      {players.length === 0 ? (
        <div className="text-[12px] text-text-dim">No player data yet.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {players.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate">
                {p.name} <span className="text-text-dim">· {POSITION_SHORT[p.position]}</span>
              </span>
              <StatusPill status={p.status} />
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
          <span className="block mt-3.5">Waiting on the commissioner to log this gameweek&apos;s results.</span>
        </Sub>
      </Panel>
    );
  }

  return <PickForm me={me} gameState={gameState} players={players} onDone={onDone} />;
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
  const query = value.trim().toLowerCase();
  const filtered = (
    query ? candidates.filter((p) => p.name.toLowerCase().includes(query)) : candidates
  ).slice(0, 8);

  return (
    <div className="relative">
      <input
        autoComplete="off"
        placeholder="Type a player name…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full bg-bg-deep border border-line-strong text-text placeholder:text-[#9fb3ab] rounded-lg px-3.5 py-3 text-[15px] focus:outline-none focus:border-accent"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-panel border border-line-strong rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(p.name);
                setOpen(false);
              }}
              className="w-full flex justify-between items-center gap-2 px-3.5 py-2.5 text-left hover:bg-bg-deep transition"
            >
              <span className="truncate">
                <span className="font-medium">{p.name}</span>
                {p.team && <span className="text-text-dim text-[12px]"> · {p.team}</span>}
              </span>
              <StatusPill status={p.status} />
            </button>
          ))}
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
    forward: "",
    midfielder: "",
    defender: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const filled = Object.values(values).every((v) => v.trim().length > 0);
  const used = new Set(me.usedPlayers);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/api/picks", { method: "POST", body: JSON.stringify(values) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden mb-5">
      <div className="px-5 pt-5">
        <PanelTitle>Your picks — Gameweek {gameState.currentGW}</PanelTitle>
        <Sub>Each player can only be picked once all season. Choose carefully.</Sub>
      </div>
      <div className="bg-bg-deep">
        {POSITIONS.map((pos) => {
          const live = players.filter((p) => p.position === pos.key && !used.has(p.name.toLowerCase()));
          const candidates =
            live.length > 0
              ? [...live].sort((a, b) => b.threat - a.threat)
              : SUGGESTED[pos.key]
                  .filter((n) => !used.has(n.toLowerCase()))
                  .map(
                    (name): LivePlayer => ({
                      name,
                      team: "",
                      position: pos.key,
                      status: "available",
                      news: "",
                      chanceOfPlaying: null,
                      threat: 0,
                    })
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
                  <PlayerPicker
                    value={values[pos.key]}
                    onChange={(v) => setValues((old) => ({ ...old, [pos.key]: v }))}
                    candidates={candidates}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <div className="px-5 py-4 bg-bg-deep flex flex-col items-end gap-2">
          {error && <div className="text-red text-[13px] self-stretch">{error}</div>}
          <PrimaryButton disabled={!filled || busy} onClick={submit}>
            {busy ? "Locking in…" : "Lock in picks"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function StandingsPanel({
  alive,
  out,
  gameState,
  myId,
}: {
  alive: StateResponse["participants"];
  out: StateResponse["participants"];
  gameState: StateResponse["gameState"];
  myId?: number;
}) {
  if (alive.length === 0 && out.length === 0) return null;
  return (
    <Panel>
      <PanelTitle>Standings</PanelTitle>
      <div className="flex flex-col gap-2">
        {alive.map((p) => (
          <div key={p.id} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3">
            <div>
              <div className="font-semibold">
                {p.name}
                {p.id === myId && <span className="text-text-dim font-normal"> (you)</span>}
              </div>
              <div className="font-mono text-[11.5px] text-text-dim">
                Survived {gameState.currentGW - 1} gameweek{gameState.currentGW - 1 === 1 ? "" : "s"}
              </div>
            </div>
            <Badge tone={p.submitted ? "alive" : "pending"}>{p.submitted ? "Alive" : "No pick yet"}</Badge>
          </div>
        ))}
        {out.map((p) => (
          <div key={p.id} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 opacity-[0.55]">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="font-mono text-[11.5px] text-text-dim">Out in gameweek {p.eliminatedGW}</div>
            </div>
            <Badge tone="out">Eliminated</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}
