"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, TextInput, PasswordInput, EmptyNote, LoadingScreen } from "@/components/ui";
import { TeamBadge } from "@/components/team-badge";
import { TEAMS } from "@/lib/data";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

interface AdminFixture {
  id: number;
  home: string;
  away: string;
  kickoff: string | null;
  source: string;
}

interface TeamFixture {
  home: string;
  away: string;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

function CollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center bg-panel border border-line rounded-2xl shadow-sm px-5 py-4 text-left"
      >
        <span className="text-[13px] font-semibold tracking-wide uppercase text-accent">{title}</span>
        <span className="text-text-dim text-[12px]">{open ? "Hide ▲" : "Show ▾"}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function TeamsAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([api("/api/admin/me"), wait(2000)]).then(([d]) => setAuthed(d.isAdmin));
  }, []);

  if (authed === null) {
    return (
      <div className="max-w-[640px] mx-auto px-4">
        <LoadingScreen label="Checking your credentials…" />
      </div>
    );
  }
  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }
  return <AdminDashboard />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ passcode }) });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="max-w-[480px] mx-auto px-4 py-16">
      <Panel>
        <PanelTitle>Admin login</PanelTitle>
        <Sub>Enter the admin passcode set in your environment (ADMIN_PASSCODE).</Sub>
        <div className="flex gap-2.5">
          <PasswordInput
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Passcode"
          />
          <PrimaryButton onClick={submit} disabled={busy}>
            {busy ? "…" : "Log in"}
          </PrimaryButton>
        </div>
        {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
      </Panel>
      <div className="text-center">
        <Link href="/teams" className="text-text-dim text-[12px] font-mono hover:text-accent">
          ← Back to the pool
        </Link>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [fixtures, setFixtures] = useState<AdminFixture[]>([]);
  const [selectedGW, setSelectedGW] = useState(1);
  const [gameState, setGameState] = useState<{ currentGW: number; phase: string; season: string } | null>(null);

  const refresh = useCallback(async () => {
    const [pubState, fixturesRes] = await Promise.all([
      api("/api/team-state"),
      api(`/api/admin/fixtures?gw=${selectedGW}`),
    ]);

    setGameState(pubState.gameState);
    setFixtures(fixturesRes.fixtures);
  }, [selectedGW]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), wait(2000)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gameState) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGW]);

  if (!gameState) {
    return (
      <div className="max-w-[640px] mx-auto px-4">
        <LoadingScreen label="Loading the admin dashboard…" />
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 pb-24 pt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin" className="font-mono text-[11px] text-text-dim hover:text-accent">
            ← All admin
          </Link>
          <h1 className="font-display text-3xl mt-1">Team Survival admin</h1>
        </div>
        <GhostButton
          className="text-[11px] px-3 py-1.5"
          onClick={async () => {
            await api("/api/admin/logout", { method: "POST" });
            location.reload();
          }}
        >
          Log out
        </GhostButton>
      </div>

      <Panel>
        <PanelTitle>Pool status</PanelTitle>
        <div className="flex gap-6 font-mono text-sm text-text-dim">
          <div>
            Gameweek: <span className="text-accent">{gameState.currentGW}</span>
          </div>
          <div>
            Phase: <span className="text-accent">{gameState.phase}</span>
          </div>
        </div>
      </Panel>

      <TeamResultsPanel gameState={gameState} onChange={refresh} />

      <CollapsibleSection title="⚙️ Fixtures">
        <ManualFixturesPanel
          fixtures={fixtures}
          selectedGW={selectedGW}
          setSelectedGW={setSelectedGW}
          onChange={refresh}
        />
      </CollapsibleSection>

      <div className="text-center mt-8">
        <Link href="/teams" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to the pool
        </Link>
      </div>
    </div>
  );
}

function ManualFixturesPanel({
  fixtures,
  selectedGW,
  setSelectedGW,
  onChange,
}: {
  fixtures: AdminFixture[];
  selectedGW: number;
  setSelectedGW: React.Dispatch<React.SetStateAction<number>>;
  onChange: () => void;
}) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [error, setError] = useState("");

  async function add() {
    if (!home.trim() || !away.trim()) {
      setError("Enter both teams.");
      return;
    }
    setError("");
    try {
      await api("/api/admin/fixtures", {
        method: "POST",
        body: JSON.stringify({
          home,
          away,
          kickoff: kickoff ? new Date(kickoff).toISOString() : null,
          gw: selectedGW,
        }),
      });
      setHome("");
      setAway("");
      setKickoff("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: number) {
    await api(`/api/admin/fixtures?id=${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Panel>
      <PanelTitle>Manage fixtures manually</PanelTitle>
      <Sub>
        Fixtures are shared with Player Picks — sync from the{" "}
        <Link href="/players/admin" className="text-accent underline">
          Player Picks admin
        </Link>{" "}
        page, or add/fix individual matches here (useful for postponements).
      </Sub>
      <div className="mb-4">
        <label className="block text-sm mb-2">Gameweek</label>
        <select
          value={selectedGW}
          onChange={(e) => setSelectedGW(Number(e.target.value))}
          className="bg-bg-deep border border-line rounded-lg px-3 py-2"
        >
          {Array.from({ length: 38 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Gameweek {i + 1}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2.5 mb-2.5">
        <TextInput list="teams" value={home} onChange={(e) => setHome(e.target.value)} placeholder="Home team" />
        <TextInput list="teams" value={away} onChange={(e) => setAway(e.target.value)} placeholder="Away team" />
      </div>
      <datalist id="teams">
        {TEAMS.map((t) => (
          <option value={t} key={t} />
        ))}
      </datalist>
      <div className="flex gap-2.5">
        <input
          type="datetime-local"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          className="flex-1 bg-bg-deep border border-line-strong text-text rounded-lg px-3.5 py-3"
        />
        <PrimaryButton onClick={add}>Add fixture</PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
      <div className="flex flex-col gap-2 mt-4">
        {fixtures.length === 0 && <EmptyNote>No fixtures for this gameweek yet.</EmptyNote>}
        {fixtures.map((f) => (
          <div key={f.id} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3">
            <div>
              <div className="font-semibold">
                {f.home} v {f.away}
              </div>
              <div className="font-mono text-[11.5px] text-text-dim">
                {f.kickoff ? new Date(f.kickoff).toLocaleString() : "Kick-off TBC"} · {f.source}
              </div>
            </div>
            <button onClick={() => remove(f.id)} className="text-red text-[11px] font-mono hover:underline">
              remove
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TeamResultsPanel({
  gameState,
  onChange,
}: {
  gameState: { currentGW: number; phase: string };
  onChange: () => void;
}) {
  const [fixtures, setFixtures] = useState<TeamFixture[]>([]);
  const [winningTeams, setWinningTeams] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");

  const fetchFixtures = useCallback(async () => {
    const res = await api(`/api/team-fixtures?gw=${gameState.currentGW}`);
    setFixtures(res.fixtures);
  }, [gameState.currentGW]);

  const fetchSuggestions = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestMsg("");
    try {
      const res = await api("/api/admin/team-suggested-results");
      if (!res.ok) {
        setSuggestMsg(res.message || "Couldn't derive results from fixtures.");
      } else if (res.winningTeams.length === 0) {
        setSuggestMsg("No finished matches yet for this gameweek.");
        setWinningTeams([]);
      } else {
        setWinningTeams(res.winningTeams);
        setSuggestMsg(`Derived ${res.winningTeams.length} winning team${res.winningTeams.length === 1 ? "" : "s"} from synced fixtures.`);
      }
    } catch (e) {
      setSuggestMsg((e as Error).message);
    }
    setSuggestLoading(false);
  }, []);

  useEffect(() => {
    fetchFixtures();
    if (gameState.phase !== "finished") fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentGW]);

  async function undo() {
    if (!confirm("Undo the last applied results? This restores everyone eliminated that gameweek and lets you re-apply once you're sure.")) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/admin/undo-results", { method: "POST", body: JSON.stringify({ game: "teams" }) });
      setMsg(`Undone — back on GW${res.restoredGW}.`);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  if (gameState.phase === "finished") {
    return (
      <Panel>
        <PanelTitle>Results</PanelTitle>
        <Sub>This pool has finished. Reset it from the main /admin page to start a new season.</Sub>
        <div className="mt-3">
          <DangerButton onClick={undo} disabled={busy}>
            {busy ? "Undoing…" : "🤦 Jason fucked up — undo last results"}
          </DangerButton>
        </div>
        {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
      </Panel>
    );
  }

  function toggleTeam(team: string) {
    setWinningTeams((old) =>
      old.includes(team) ? old.filter((t) => t !== team) : [...old, team]
    );
  }

  async function apply() {
    if (winningTeams.length === 0 && !confirm("No winning teams selected — this eliminates everyone who submitted picks. Continue?")) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/admin/team-results", { method: "POST", body: JSON.stringify({ winningTeams }) });
      setMsg(`Applied. ${res.eliminated} eliminated. Now on ${res.phase === "finished" ? "finished" : `GW${res.currentGW}`}.`);
      setWinningTeams([]);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  const winnerSet = new Set(winningTeams.map((t) => t.toLowerCase()));

  return (
    <Panel>
      <PanelTitle>Results · Gameweek {gameState.currentGW}</PanelTitle>
      <Sub>
        Tap the team that won each match below — anyone whose picked team isn&apos;t marked as a
        winner goes out. Matches without a final score yet can&apos;t be marked.
      </Sub>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={fetchSuggestions}
          disabled={suggestLoading}
          className="text-[12px] text-accent hover:underline disabled:opacity-40"
        >
          {suggestLoading ? "Deriving from fixtures…" : "🔮 Suggest from fixtures"}
        </button>
        {suggestMsg && <div className="text-[11.5px] text-text-dim">{suggestMsg}</div>}
      </div>
      {fixtures.length === 0 ? (
        <EmptyNote>No fixtures synced for this gameweek yet.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {fixtures.map((f, i) => {
            const finished = f.status === "FINISHED" || f.status === "AWARDED";
            const hasScore = f.homeScore !== null && f.awayScore !== null;
            const isDraw = finished && hasScore && f.homeScore === f.awayScore;
            return (
              <div key={i} className="bg-bg-deep border border-line rounded-lg px-3.5 py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <TeamToggle
                    team={f.home}
                    enabled={finished && hasScore && !isDraw}
                    selected={winnerSet.has(f.home.toLowerCase())}
                    onClick={() => toggleTeam(f.home)}
                  />
                  <span className="text-text-dim text-[12px]">
                    {hasScore ? `${f.homeScore} - ${f.awayScore}` : "v"}
                  </span>
                  <TeamToggle
                    team={f.away}
                    enabled={finished && hasScore && !isDraw}
                    selected={winnerSet.has(f.away.toLowerCase())}
                    onClick={() => toggleTeam(f.away)}
                  />
                </div>
                {!finished && (
                  <div className="text-[11px] text-text-dim mt-1.5">
                    {f.status === "POSTPONED" || f.status === "CANCELLED" ? f.status : "Not played yet"}
                  </div>
                )}
                {isDraw && (
                  <div className="text-[11px] text-text-dim mt-1.5">
                    🤝 Draw — no team wins, both picks are eliminated automatically.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <PrimaryButton onClick={apply} disabled={busy}>
          {busy ? "Applying…" : `Apply results & advance`}
        </PrimaryButton>
        <DangerButton onClick={undo} disabled={busy || gameState.currentGW <= 1} title={gameState.currentGW <= 1 ? "Nothing to undo yet." : undefined}>
          🤦 Jason fucked up — undo last results
        </DangerButton>
      </div>
      {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
    </Panel>
  );
}

function TeamToggle({
  team,
  enabled,
  selected,
  onClick,
}: {
  team: string;
  enabled: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
        selected
          ? "bg-green-alive/10 border-green-alive/30 text-green-alive"
          : "bg-panel border-line-strong text-text hover:border-accent/40"
      }`}
    >
      <TeamBadge team={team} size={18} />
      {team}
      {selected && " ✓"}
    </button>
  );
}
