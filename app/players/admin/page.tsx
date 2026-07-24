"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, TextInput, EmptyNote, LoadingScreen } from "@/components/ui";
import { TEAMS } from "@/lib/data";
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

export default function PlayersAdminPage() {
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
          <TextInput
            type="password"
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
        <Link href="/players" className="text-text-dim text-[12px] font-mono hover:text-accent">
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
  const [syncStatus, setSyncStatus] = useState<{ lastSyncedAt: string | null; lastError: string | null } | null>(null);

  const refresh = useCallback(async () => {
    const [pubState, fixturesRes, syncRes] = await Promise.all([
      api("/api/state"),
      api(`/api/admin/fixtures?gw=${selectedGW}`),
      api("/api/admin/sync-status"),
    ]);

    setGameState(pubState.gameState);
    setFixtures(fixturesRes.fixtures);
    setSyncStatus(syncRes);
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
          <h1 className="font-display text-3xl mt-1">Player Picks admin</h1>
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
        <FixturesSourcePanel gameState={gameState} syncStatus={syncStatus} onChange={refresh} />
        <PlayerDataPanel />
        <ManualFixturesPanel
          fixtures={fixtures}
          selectedGW={selectedGW}
          setSelectedGW={setSelectedGW}
          onChange={refresh}
        />
      </CollapsibleSection>

      <div className="text-center mt-8">
        <Link href="/players" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to the pool
        </Link>
      </div>
    </div>
  );
}

function FixturesSourcePanel({
  gameState,
  syncStatus,
  onChange,
}: {
  gameState: { season: string };
  syncStatus: { lastSyncedAt: string | null; lastError: string | null } | null;
  onChange: () => void;
}) {
  const [season, setSeason] = useState(gameState.season);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveSettings() {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ season }) });
      setMsg("Saved.");
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  async function syncNow() {
    setBusy(true);
    setMsg("Syncing…");
    try {
      const res = await api("/api/cron/sync-fixtures");
      if (!res.ok || res.fixturesSynced === 0) {
        setMsg(`${res.message}\n\n${JSON.stringify(res.diagnostics, null, 2)}`);
      } else {
        setMsg(`Synced ${res.fixturesSynced} fixtures.`);
      }
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  async function checkAccountStatus() {
    setBusy(true);
    setMsg("Checking football-data.org connection…");
    try {
      const res = await api("/api/admin/football-data-status");
      setMsg(JSON.stringify(res.body, null, 2));
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Live fixtures source</PanelTitle>
      <Sub>
        Fixtures sync automatically once a day from football-data.org (set FOOTBALL_DATA_API_KEY
        and CRON_SECRET in your environment — the Vercel Cron job in vercel.json handles the
        rest). It always fetches whatever season football-data.org currently considers
        &quot;current&quot; for the Premier League, so there&apos;s no season parameter to configure.
        You can also trigger a sync manually here.
      </Sub>
      <div className="mb-2.5">
        <div className="text-[11px] text-text-dim mb-1 font-mono">Official site season code (for the premierleague.com link only)</div>
        <TextInput value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026-27" />
      </div>
      <div className="flex gap-2.5 flex-wrap">
        <GhostButton onClick={saveSettings} disabled={busy}>
          Save settings
        </GhostButton>
        <GhostButton onClick={syncNow} disabled={busy}>
          Sync fixtures now
        </GhostButton>
        <GhostButton onClick={checkAccountStatus} disabled={busy}>
          Check football-data.org connection
        </GhostButton>
      </div>
      {msg && (
        <pre className="text-[12px] text-text-dim mt-2.5 whitespace-pre-wrap break-words font-mono bg-bg-deep border border-line rounded-lg p-3">
          {msg}
        </pre>
      )}
      {syncStatus && (
        <div className="text-[11.5px] text-text-dim font-mono mt-3">
          {syncStatus.lastSyncedAt
            ? `Last synced ${new Date(syncStatus.lastSyncedAt).toLocaleString()}`
            : "Never synced yet."}
          {syncStatus.lastError && <div className="text-red mt-1">Last error: {syncStatus.lastError}</div>}
        </div>
      )}
    </Panel>
  );
}

function PlayerDataPanel() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [syncStatus, setSyncStatus] = useState<{ lastSyncedAt: string | null; lastError: string | null } | null>(
    null
  );

  const loadStatus = useCallback(async () => {
    const res = await api("/api/admin/player-sync-status");
    setSyncStatus(res);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function syncNow() {
    setBusy(true);
    setMsg("Syncing…");
    try {
      const res = await api("/api/cron/sync-players");
      setMsg(res.ok ? `Synced ${res.playersSynced} players.` : res.message);
      await loadStatus();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Player data (injuries &amp; threats)</PanelTitle>
      <Sub>
        Pulls every outfield player&apos;s club, status (available / doubtful / injured /
        suspended) and attacking threat rating from the Fantasy Premier League API. Powers the
        injury flags in the pick form and the &quot;key threats&quot; dropdown on each fixture.
      </Sub>
      <GhostButton onClick={syncNow} disabled={busy}>
        Sync player data now
      </GhostButton>
      {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
      {syncStatus && (
        <div className="text-[11.5px] text-text-dim font-mono mt-3">
          {syncStatus.lastSyncedAt
            ? `Last synced ${new Date(syncStatus.lastSyncedAt).toLocaleString()}`
            : "Never synced yet."}
          {syncStatus.lastError && <div className="text-red mt-1">Last error: {syncStatus.lastError}</div>}
        </div>
      )}
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
      <Sub>Add or fix individual matches by hand — useful for postponements.</Sub>
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

function ScorerPicker({
  candidates,
  onAdd,
}: {
  candidates: LivePlayer[];
  onAdd: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const filtered = (
    query ? candidates.filter((p) => p.name.toLowerCase().includes(query)) : candidates
  ).slice(0, 8);

  function addTyped() {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        autoComplete="off"
        placeholder="Type a scorer's name to add them…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === "Enter" && addTyped()}
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
                onAdd(p.name);
                setValue("");
                setOpen(false);
              }}
              className="w-full flex justify-between items-center gap-2 px-3.5 py-2.5 text-left hover:bg-bg-deep transition"
            >
              <span className="truncate">
                <span className="font-medium">{p.name}</span>
                {p.team && <span className="text-text-dim text-[12px]"> · {p.team}</span>}
              </span>
            </button>
          ))}
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
    api("/api/players")
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
      const res = await api("/api/admin/suggested-scorers");
      if (!res.ok) {
        setSuggestMsg(res.message || "Couldn't reach the live scorer data.");
      } else if (res.scorers.length === 0) {
        setSuggestMsg("No goals recorded yet for this gameweek.");
      } else {
        const existing = new Set(scorersRef.current.map((s) => s.toLowerCase()));
        const newOnes = res.scorers.filter((n: string) => !existing.has(n.toLowerCase()));
        if (newOnes.length === 0) {
          setSuggestMsg("Live data matches what you've already got.");
        } else {
          setSuggested(newOnes);
          setSuggestMsg(
            `Live data found ${newOnes.length} scorer${newOnes.length === 1 ? "" : "s"} you haven't added yet — add them?`
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
        <Sub>This pool has finished. Reset it from the main /admin page to start a new season.</Sub>
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
      const res = await api("/api/admin/results", { method: "POST", body: JSON.stringify({ scorers }) });
      setMsg(`Applied. ${res.eliminated} eliminated. Now on ${res.phase === "finished" ? "finished" : `GW${res.currentGW}`}.`);
      setScorers([]);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  const candidates = players.filter((p) => !scorers.some((s) => s.toLowerCase() === p.name.toLowerCase()));

  return (
    <Panel>
      <PanelTitle>Results · Gameweek {gameState.currentGW}</PanelTitle>
      <Sub>
        Add scorers as boxes below, either by hand or by checking live match data. Anyone whose
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
      <ScorerPicker candidates={candidates} onAdd={addScorer} />
      <div className="flex items-center gap-3 mt-2.5">
        <button
          onClick={fetchSuggestions}
          disabled={suggestLoading}
          className="text-[12px] text-accent hover:underline disabled:opacity-40"
        >
          {suggestLoading ? "Checking live data…" : "🔮 Check live data"}
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
