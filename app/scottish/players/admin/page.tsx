"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, TextInput, PasswordInput, EmptyNote, LoadingScreen } from "@/components/ui";
import { SCOTTISH_TEAMS } from "@/lib/data";
import type { LivePlayer } from "@/lib/types";

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

export default function ScottishPlayersAdminPage() {
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
        <Link href="/scottish/players" className="text-text-dim text-[12px] font-mono hover:text-accent">
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
      api("/api/scot-state"),
      api(`/api/admin/scot-fixtures?gw=${selectedGW}`),
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
          <h1 className="font-display text-3xl mt-1">🏴 Scottish Player Picks admin</h1>
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

      <ResultsPanel gameState={gameState} onChange={refresh} />

      <CollapsibleSection title="⚙️ Fixtures & player data">
        <SyncPanel onChange={refresh} />
        <ManualFixturesPanel
          fixtures={fixtures}
          selectedGW={selectedGW}
          setSelectedGW={setSelectedGW}
          onChange={refresh}
        />
      </CollapsibleSection>

      <div className="text-center mt-8">
        <Link href="/scottish/players" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to the pool
        </Link>
      </div>
    </div>
  );
}

function SyncPanel({ onChange }: { onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function syncNow() {
    setBusy(true);
    setMsg("Syncing from TheSportsDB…");
    try {
      const res = await api("/api/admin/scot-sync-fixtures", { method: "POST" });
      setMsg(res.ok ? `Synced ${res.fixturesSynced} fixtures.` : res.message);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Sync fixtures &amp; scores</PanelTitle>
      <Sub>
        Pulls the whole Scottish Premiership season from TheSportsDB&apos;s free API in one go —
        fixtures, kick-off times and final scores. This now also runs automatically once a day
        (00:00 UTC, piggybacking on the main season&apos;s cron job) — use this button if you need
        fresher data sooner than that.
      </Sub>
      <GhostButton onClick={syncNow} disabled={busy}>
        🔄 Sync fixtures &amp; scores
      </GhostButton>
      {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
    </Panel>
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
      await api("/api/admin/scot-fixtures", {
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
    await api(`/api/admin/scot-fixtures?id=${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Panel>
      <PanelTitle>Manage fixtures manually</PanelTitle>
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
      <Sub>Add or fix individual matches by hand — useful for postponements, or gameweeks not yet published.</Sub>
      <div className="flex gap-2.5 mb-2.5">
        <TextInput list="scot-teams" value={home} onChange={(e) => setHome(e.target.value)} placeholder="Home team" />
        <TextInput list="scot-teams" value={away} onChange={(e) => setAway(e.target.value)} placeholder="Away team" />
      </div>
      <datalist id="scot-teams">
        {SCOTTISH_TEAMS.map((t) => (
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

function ScorerPicker({
  candidates,
  onAdd,
}: {
  candidates: LivePlayer[];
  onAdd: (name: string) => void;
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
    onAdd(name);
    setOpen(false);
    setQuery("");
  }

  function addTyped() {
    if (!query.trim()) return;
    onAdd(query.trim());
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
        <span className="truncate text-[#9fb3ab]">Select a team, then a scorer to add…</span>
        <span className="text-text-dim text-[11px] shrink-0">{open ? "▲" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-panel border border-line-strong rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-line flex gap-2">
            <input
              autoComplete="off"
              autoFocus
              placeholder="Search team or player, or type a name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTyped()}
              className="flex-1 bg-bg-deep border border-line-strong text-text placeholder:text-[#9fb3ab] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
            />
            <GhostButton className="px-3 py-2 text-[12px]" onClick={addTyped}>
              Add
            </GhostButton>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-3.5 py-3 text-[13px] text-text-dim">
                No matches — press Add to add &quot;{query}&quot; anyway.
              </div>
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
                            className="w-full flex items-center gap-2 pl-7 pr-3.5 py-2 text-left hover:bg-panel transition text-[13px] text-text"
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

function ResultsPanel({ gameState, onChange }: { gameState: { currentGW: number; phase: string }; onChange: () => void }) {
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [scorers, setScorers] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");

  const scorersRef = useRef<string[]>([]);
  useEffect(() => {
    scorersRef.current = scorers;
  }, [scorers]);

  useEffect(() => {
    api("/api/scot-players")
      .then((d) => setPlayers(d.players))
      .catch(() => {});
  }, []);

  function addScorer(name: string) {
    setScorers((old) => (old.some((s) => s.toLowerCase() === name.toLowerCase()) ? old : [...old, name]));
  }

  function removeScorer(name: string) {
    setScorers((old) => old.filter((s) => s !== name));
  }

  const fetchSuggestions = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestMsg("");
    setSuggested([]);
    try {
      const res = await api("/api/admin/scot-suggested-scorers");
      if (!res.ok) {
        setSuggestMsg(res.message || "Couldn't derive scorers from synced fixtures.");
      } else if (res.scorers.length === 0) {
        setSuggestMsg("No finished matches with goals synced yet for this gameweek.");
      } else {
        const existing = new Set(scorersRef.current.map((s) => s.toLowerCase()));
        const newOnes = res.scorers.filter((n: string) => !existing.has(n.toLowerCase()));
        if (newOnes.length === 0) {
          setSuggestMsg("Synced data matches what you've already got.");
        } else {
          setSuggested(newOnes);
          setSuggestMsg(
            `Synced data found ${newOnes.length} scorer${newOnes.length === 1 ? "" : "s"} you haven't added yet — add them?`
          );
        }
      }
    } catch (e) {
      setSuggestMsg((e as Error).message);
    }
    setSuggestLoading(false);
  }, []);

  function acceptSuggested() {
    setScorers((old) => {
      const existing = new Set(old.map((s) => s.toLowerCase()));
      const toAdd = suggested.filter((n) => !existing.has(n.toLowerCase()));
      return [...old, ...toAdd];
    });
    setSuggested([]);
    setSuggestMsg("Added.");
  }

  function dismissSuggested() {
    setSuggested([]);
    setSuggestMsg("");
  }

  useEffect(() => {
    if (gameState.phase !== "finished") fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentGW]);

  if (gameState.phase === "finished") {
    return (
      <Panel>
        <PanelTitle>Results</PanelTitle>
        <Sub>This trial has finished. Reset it from the main /admin page to start again.</Sub>
      </Panel>
    );
  }

  async function apply() {
    if (scorers.length === 0 && !confirm("No scorers entered — this eliminates everyone who submitted picks. Continue?")) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/admin/scot-results", { method: "POST", body: JSON.stringify({ scorers }) });
      setMsg(`Applied. ${res.eliminated} eliminated. Now on ${res.phase === "finished" ? "finished" : `GW${res.currentGW}`}.`);
      setScorers([]);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Results · Gameweek {gameState.currentGW}</PanelTitle>
      <Sub>
        Add scorers as boxes below, either by hand or by checking synced match data. Anyone whose
        all three picks are missing from this list goes out.
      </Sub>
      <div className="flex flex-wrap gap-2 mb-3">
        {scorers.length === 0 ? (
          <EmptyNote>No scorers added yet.</EmptyNote>
        ) : (
          scorers.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 text-[13px] pl-3 pr-2 py-1.5 rounded-full bg-bg-deep border border-line-strong text-text"
            >
              ⚽ {name}
              <button
                type="button"
                onClick={() => removeScorer(name)}
                aria-label={`Remove ${name}`}
                className="text-text-dim hover:text-red leading-none text-base"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <ScorerPicker
        candidates={players.filter((p) => !scorers.some((s) => s.toLowerCase() === p.name.toLowerCase()))}
        onAdd={addScorer}
      />
      <div className="flex items-center gap-3 mt-2.5">
        <button
          onClick={fetchSuggestions}
          disabled={suggestLoading}
          className="text-[12px] text-accent hover:underline disabled:opacity-40"
        >
          {suggestLoading ? "Checking synced data…" : "🔮 Check synced data"}
        </button>
        {suggested.length === 0 && suggestMsg && <div className="text-[11.5px] text-text-dim">{suggestMsg}</div>}
      </div>
      {suggested.length > 0 && (
        <div className="mt-2.5 bg-accent/10 border border-accent/30 rounded-lg px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[12.5px] text-text">
            {suggestMsg} <span className="font-semibold">{suggested.join(", ")}</span>
          </div>
          <div className="flex gap-2">
            <PrimaryButton className="px-3 py-1.5 text-[12px]" onClick={acceptSuggested}>
              ✅ Yes, add them
            </PrimaryButton>
            <GhostButton className="px-3 py-1.5 text-[12px]" onClick={dismissSuggested}>
              ✖ No, skip
            </GhostButton>
          </div>
        </div>
      )}
      <div className="mt-3">
        <PrimaryButton onClick={apply} disabled={busy}>
          {busy ? "Applying…" : `Apply results & advance`}
        </PrimaryButton>
      </div>
      {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
    </Panel>
  );
}
