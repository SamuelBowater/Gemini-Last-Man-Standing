"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, TextInput, Badge, EmptyNote } from "@/components/ui";
import { POSITIONS, SUGGESTED, PositionKey } from "@/lib/data";
import type { StateResponse, Fixture } from "@/lib/types";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
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
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api("/api/state");
    setState(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-10 text-text-dim text-sm">Loading…</div>
    );
  }
  if (!state) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-10 text-text-dim text-sm">
        Couldn&apos;t load the pool. Refresh to try again.
      </div>
    );
  }

  const { gameState, participants, fixtures, officialFixturesUrl, me } = state;
  const alive = participants.filter((p) => p.status !== "eliminated");
  const out = participants
    .filter((p) => p.status === "eliminated")
    .sort((a, b) => (b.eliminatedGW || 0) - (a.eliminatedGW || 0));

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-24 pt-7">
      <Hero gameState={gameState} aliveCount={alive.length} total={participants.length} />

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

      <FixturesPanel gameState={gameState} fixtures={fixtures} officialUrl={officialFixturesUrl} />

      {gameState.phase === "finished" && <WinnerBanner alive={alive} gw={gameState.currentGW} />}

      {!me && participants.length === 0 && (
        <Panel>
          <PanelTitle>No players yet</PanelTitle>
          <Sub>
            The commissioner needs to add players before anyone can log in. Head to{" "}
            <Link href="/admin" className="text-gold underline">
              /admin
            </Link>{" "}
            to add the group and hand out codes.
          </Sub>
        </Panel>
      )}

      {!me && participants.length > 0 && <LoginPanel onSuccess={refresh} />}

      {me && gameState.phase !== "finished" && <PickZone me={me} gameState={gameState} onDone={refresh} />}

      <StandingsPanel alive={alive} out={out} gameState={gameState} myId={me?.id} />

      <div className="text-center mt-8">
        <Link href="/admin" className="text-text-dim text-[11px] font-mono hover:text-gold">
          Commissioner login →
        </Link>
      </div>

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        LAST MAN STANDING · one net, three shots, no excuses
      </footer>
    </div>
  );
}

function Hero({
  gameState,
  aliveCount,
  total,
}: {
  gameState: StateResponse["gameState"];
  aliveCount: number;
  total: number;
}) {
  return (
    <div className="text-center pb-6 mb-6 border-b border-line">
      <div className="font-mono text-[12px] tracking-[3px] uppercase text-gold mb-2.5">
        Premier League Survival Pool
      </div>
      <h1 className="font-display text-[54px] leading-[0.95] mb-3" style={{ textShadow: "0 0 24px rgba(255,184,0,0.18)" }}>
        Last Man
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
            <div className="font-mono text-[22px] font-bold text-gold">{cell.num}</div>
            <div className="text-[10px] tracking-[1.5px] text-text-dim uppercase mt-0.5">{cell.label}</div>
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
        borderColor: won ? "var(--gold)" : "var(--red)",
        background: won
          ? "radial-gradient(circle at center, rgba(255,184,0,0.14), transparent 70%)"
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

function FixturesPanel({
  gameState,
  fixtures,
  officialUrl,
}: {
  gameState: StateResponse["gameState"];
  fixtures: Fixture[];
  officialUrl: string;
}) {
  return (
    <Panel>
      <PanelTitle>Fixtures · Gameweek {gameState.currentGW}</PanelTitle>
      {fixtures.length === 0 ? (
        <EmptyNote>
          No fixtures added for this gameweek yet — check back soon, or use the official link
          below.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {fixtures.map((f, i) => (
            <div key={i} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3">
              <div>
                <div className="font-semibold">
                  {f.home} <span className="text-text-dim font-normal">v</span> {f.away}
                </div>
                <div className="font-mono text-[11.5px] text-text-dim">{formatKickoff(f.kickoff)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <a
        href={officialUrl}
        target="_blank"
        rel="noopener"
        className="inline-block mt-3.5 text-[12.5px] text-gold border-b border-dotted border-gold no-underline"
      >
        Check kick-off times &amp; live scores on premierleague.com ↗
      </a>
    </Panel>
  );
}

function PickZone({
  me,
  gameState,
  onDone,
}: {
  me: NonNullable<StateResponse["me"]>;
  gameState: StateResponse["gameState"];
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

  return <PickForm me={me} gameState={gameState} onDone={onDone} />;
}

function PickForm({
  me,
  gameState,
  onDone,
}: {
  me: NonNullable<StateResponse["me"]>;
  gameState: StateResponse["gameState"];
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
          const suggestions = SUGGESTED[pos.key].filter((n) => !used.has(n.toLowerCase()));
          return (
            <div key={pos.key} className="px-5 py-[18px] border-b border-line">
              <div className="font-mono text-[11px] tracking-[2px] text-gold uppercase">{pos.label}</div>
              <div className="text-text-dim text-[12.5px] my-1 mb-3">{pos.hint}</div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-[38px] h-[38px] min-w-[38px] rounded-full border-2 flex items-center justify-center font-display text-[15px] ${
                    values[pos.key] ? "border-gold text-gold" : "border-line-strong text-text-dim"
                  }`}
                >
                  {values[pos.key] ? "✓" : "?"}
                </div>
                <div className="flex-1">
                  <input
                    list={`dl-${pos.key}`}
                    autoComplete="off"
                    placeholder="Type a player name…"
                    value={values[pos.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [pos.key]: e.target.value }))}
                    className="w-full bg-bg-deep border border-line-strong text-text placeholder:text-[#5f7a6a] rounded-lg px-3.5 py-3 text-[15px] focus:outline-none focus:border-gold"
                  />
                  <datalist id={`dl-${pos.key}`}>
                    {suggestions.map((n) => (
                      <option value={n} key={n} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          );
        })}
        <div className="px-5 py-4 bg-black/20 flex flex-col items-end gap-2">
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
