"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, GhostButton, DangerButton, Badge, EmptyNote, LoadingScreen, Modal } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import { ChangePinPanel } from "@/components/change-pin-panel";
import type { Fixture, Participant } from "@/lib/types";
import type { TeamStateResponse, TeamMe, TeamGameState, TeamPickHistoryEntry } from "@/lib/team-types";

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
    case "SUSPENDED":
      return "Suspended";
    case "POSTPONED":
      return "Postponed";
    case "CANCELLED":
      return "Cancelled";
    case "AWARDED":
      return "Awarded";
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

export default function TeamSurvival() {
  const [state, setState] = useState<TeamStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [fixturesOpen, setFixturesOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api("/api/team-state"));
    } catch {
      // Transient blip (e.g. the database waking from idle) — retry once
      // before giving up, so a brief hiccup doesn't need a manual refresh.
      await wait(1200);
      setState(await api("/api/team-state"));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), wait(2000)]).finally(() => setLoading(false));
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
  const participants = allParticipants.filter((p) => p.canPlayTeams);
  const alive = participants.filter((p) => p.status !== "eliminated");

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-24 pt-7">
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

      {me && !me.canPlayTeams && (
        <Panel>
          <PanelTitle>Not in this pool</PanelTitle>
          <Sub>
            The admin hasn&apos;t added you to Team Survival. Head back to the{" "}
            <Link href="/" className="text-accent underline">
              home page
            </Link>{" "}
            to see what you can play.
          </Sub>
        </Panel>
      )}

      {me && me.canPlayTeams && gameState.locked && (
        <Panel>
          <PanelTitle>Not open yet</PanelTitle>
          <Sub>
            You&apos;re signed up for Team Survival, but the admin has this locked until the season
            starts. Check back soon!
          </Sub>
        </Panel>
      )}

      {me && me.canPlayTeams && !gameState.locked && gameState.phase !== "finished" && (
        <PickZone me={me} gameState={gameState} availableTeams={state.availableTeams} onDone={refresh} />
      )}

      {me && me.canPlayTeams && !gameState.locked && <PickHistoryPanel history={me.history} />}

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI&apos;S LAST MAN STANDING · pick wisely, there&apos;s no going back
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
  gameState: TeamGameState;
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
          href="/teams/standings"
          className="font-semibold text-sm rounded-xl px-4 py-2 text-[13px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
        >
          📊 Standings
        </Link>
        <Link
          href="/teams/admin"
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
      title: "Pick a Team",
      body: "Every gameweek, choose one Premier League team from that week's fixtures.",
    },
    {
      title: "Win to Survive",
      body: "If your team wins, you live to fight another week. A draw or a loss knocks you out.",
    },
    {
      title: "No Repeats",
      body: "Once you've picked a team, they're off the table for the rest of the season.",
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

function WinnerBanner({ alive, gw }: { alive: Participant[]; gw: number }) {
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
          : `Nobody's team came through in gameweek ${gw}. The pool ends with no survivor.`}
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
        {label && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">{label}</span>
        )}
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
  const [officialUrl, setOfficialUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedGW(currentGW);
  }, [currentGW]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/team-fixtures?gw=${selectedGW}`).then((data) => {
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
          No fixtures added for this gameweek yet — check back soon, or use the official link
          below.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {fixtures.map((f, i) => (
            <div key={i} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3">
              <div className="font-semibold flex items-center gap-1.5">
                <TeamBadge team={f.home} size={20} />
                {f.home} <span className="text-text-dim font-normal">v</span>
                <TeamBadge team={f.away} size={20} />
                {f.away}
              </div>
              <FixtureStatusLine fixture={f} />
            </div>
          ))}
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
    </div>
  );
}

function PickZone({
  me,
  gameState,
  availableTeams,
  onDone,
}: {
  me: TeamMe;
  gameState: TeamGameState;
  availableTeams: string[];
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
          Your team didn&apos;t win in gameweek {me.eliminatedGW}. Stick around and watch the rest
          of the pool play out below.
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
          <PanelTitle>Pick locked — GW{gameState.currentGW}</PanelTitle>
          <div className="flex gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-md bg-bg-deep border border-line text-text-dim">
              <TeamBadge team={me.pick.team} size={18} />
              {me.pick.team}
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
        <PanelTitle>Pick locked — GW{gameState.currentGW}</PanelTitle>
        <Sub>
          You didn&apos;t lock in a pick before kickoff this gameweek. Hang tight for results.
        </Sub>
      </Panel>
    );
  }

  return <TeamPickForm me={me} gameState={gameState} availableTeams={availableTeams} onDone={onDone} />;
}

function PickHistoryPanel({ history }: { history: TeamPickHistoryEntry[] }) {
  return (
    <Panel>
      <PanelTitle>Your picks so far</PanelTitle>
      {history.length === 0 ? (
        <EmptyNote>No previous picks to show just yet.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {[...history].reverse().map((h) => (
            <div key={h.gw} className="bg-bg-deep border border-line rounded-xl px-3.5 py-3 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-text-dim mb-1">
                  Gameweek {h.gw}
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
      )}
    </Panel>
  );
}

function ResultBadge({ result }: { result: TeamPickHistoryEntry["result"] }) {
  const label: Record<TeamPickHistoryEntry["result"], string> = {
    win: "Won ✓",
    draw: "Drew",
    loss: "Lost",
    pending: "Pending",
    unplayed: "Pending",
  };
  const tone: "alive" | "out" | "pending" =
    result === "win" ? "alive" : result === "pending" || result === "unplayed" ? "pending" : "out";
  return <Badge tone={tone}>{label[result]}</Badge>;
}

function TeamPickForm({
  me,
  gameState,
  availableTeams,
  onDone,
}: {
  me: TeamMe;
  gameState: TeamGameState;
  availableTeams: string[];
  onDone: () => void;
}) {
  const [value, setValue] = useState(me.pick?.team || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const used = new Set(me.usedTeams);
  const candidates = availableTeams.filter((t) => !used.has(t.toLowerCase()) || t === value);

  async function submit(team: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/team-picks", { method: "POST", body: JSON.stringify({ team }) });
      setValue(team);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function clear() {
    if (!confirm("Clear your pick for this gameweek? You'll need to pick again before the deadline.")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/team-picks", { method: "DELETE" });
      setValue("");
      setNotice("Your pick has been cleared for this gameweek.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden mb-5">
      <div className="px-5 pt-5">
        <PanelTitle>Your pick — Gameweek {gameState.currentGW}</PanelTitle>
        <Sub>
          Each team can only be picked once all season. Choose carefully.
          {gameState.pickDeadline && (
            <span className="block mt-1">
              You can change your pick until {formatKickoff(gameState.pickDeadline)}.
            </span>
          )}
        </Sub>
      </div>
      <div className="bg-bg-deep px-5 pt-4 pb-5">
        {candidates.length === 0 ? (
          <EmptyNote>No fixtures synced for this gameweek yet — check back soon.</EmptyNote>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {candidates.map((team) => {
              const selected = value === team;
              return (
                <button
                  key={team}
                  type="button"
                  disabled={busy}
                  onClick={() => submit(team)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-[13px] font-semibold text-center transition ${
                    selected
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-panel border-line-strong text-text hover:border-accent/40"
                  }`}
                >
                  <TeamBadge team={team} />
                  <span>{team}</span>
                  {selected && <span className="block text-[10px] -mt-1">✓ Locked in</span>}
                </button>
              );
            })}
          </div>
        )}
        {error && <div className="text-red text-[13px] mt-3">{error}</div>}
        {notice && <div className="text-green-alive text-[13px] mt-3">✅ {notice}</div>}
        {me.pick && (
          <div className="flex justify-end mt-4">
            <DangerButton disabled={busy} onClick={clear}>
              🗑️ Clear pick
            </DangerButton>
          </div>
        )}
      </div>
    </div>
  );
}
