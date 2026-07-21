"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, TextInput, Badge, EmptyNote } from "@/components/ui";
import { TEAMS } from "@/lib/data";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

interface AdminParticipant {
  id: number;
  name: string;
  code: string;
  status: "alive" | "eliminated";
  eliminatedGW: number | null;
}
interface AdminFixture {
  id: number;
  home: string;
  away: string;
  kickoff: string | null;
  source: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    api("/api/admin/me").then((d) => setAuthed(d.isAdmin));
  }, []);

  if (authed === null) {
    return <div className="max-w-[640px] mx-auto px-4 py-10 text-text-dim text-sm">Loading…</div>;
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
        <PanelTitle>Commissioner login</PanelTitle>
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
        <Link href="/" className="text-text-dim text-[12px] font-mono hover:text-gold">
          ← Back to the pool
        </Link>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [players, setPlayers] = useState<AdminParticipant[]>([]);
  const [fixtures, setFixtures] = useState<AdminFixture[]>([]);
  const [gameState, setGameState] = useState<{ currentGW: number; phase: string; season: string; apiSeason: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ lastSyncedAt: string | null; lastError: string | null } | null>(null);

  const refresh = useCallback(async () => {
    const [pubState, playersRes, fixturesRes, syncRes] = await Promise.all([
      api("/api/state"),
      api("/api/admin/players"),
      api("/api/admin/fixtures"),
      api("/api/admin/sync-status"),
    ]);
    setGameState(pubState.gameState);
    setPlayers(playersRes.participants);
    setFixtures(fixturesRes.fixtures);
    setSyncStatus(syncRes);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh();
  }, [refresh]);

  if (!gameState) return <div className="max-w-[640px] mx-auto px-4 py-10 text-text-dim text-sm">Loading…</div>;

  return (
    <div className="max-w-[640px] mx-auto px-4 pb-24 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl">Commissioner</h1>
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
            Gameweek: <span className="text-gold">{gameState.currentGW}</span>
          </div>
          <div>
            Phase: <span className="text-gold">{gameState.phase}</span>
          </div>
        </div>
      </Panel>

      <PlayersPanel players={players} onChange={refresh} />
      <FixturesSourcePanel gameState={gameState} syncStatus={syncStatus} onChange={refresh} />
      <ManualFixturesPanel fixtures={fixtures} onChange={refresh} />
      <ResultsPanel gameState={gameState} onChange={refresh} />
      <DangerZone onChange={refresh} />

      <div className="text-center mt-8">
        <Link href="/" className="text-text-dim text-[11px] font-mono hover:text-gold">
          ← Back to the pool
        </Link>
      </div>
    </div>
  );
}

function PlayersPanel({ players, onChange }: { players: AdminParticipant[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/players", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function remove(id: number) {
    if (!confirm("Remove this player? Their picks stay in the database but they'll drop off the pool.")) return;
    await api(`/api/admin/players?id=${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Panel>
      <PanelTitle>Manage players</PanelTitle>
      <Sub>Add everyone in the group. Each gets a random 4-digit code to log in with.</Sub>
      <div className="flex gap-2.5">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Player name"
        />
        <PrimaryButton onClick={add} disabled={busy}>
          Add player
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
      <div className="flex flex-col gap-2 mt-4">
        {players.length === 0 && <EmptyNote>No players added yet.</EmptyNote>}
        {players.map((p) => (
          <div key={p.id} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="font-mono text-[11.5px] text-text-dim">
                {p.status === "eliminated" ? `Eliminated · GW${p.eliminatedGW}` : "Alive"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="pending">{p.code}</Badge>
              <button onClick={() => remove(p.id)} className="text-red text-[11px] font-mono hover:underline">
                remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FixturesSourcePanel({
  gameState,
  syncStatus,
  onChange,
}: {
  gameState: { season: string; apiSeason: string };
  syncStatus: { lastSyncedAt: string | null; lastError: string | null } | null;
  onChange: () => void;
}) {
  const [season, setSeason] = useState(gameState.season);
  const [apiSeason, setApiSeason] = useState(gameState.apiSeason);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveSettings() {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ season, apiSeason }) });
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
      setMsg(`Synced ${res.fixturesSynced} fixtures.`);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Live fixtures source</PanelTitle>
      <Sub>
        Fixtures sync automatically once a day from API-Football (set API_FOOTBALL_KEY and
        CRON_SECRET in your environment, and the Vercel Cron job in vercel.json handles the
        rest). You can also trigger a sync manually here.
      </Sub>
      <div className="flex gap-2.5 mb-2.5">
        <div className="flex-1">
          <div className="text-[11px] text-text-dim mb-1 font-mono">Official site season code</div>
          <TextInput value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026-27" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-text-dim mb-1 font-mono">API-Football season year</div>
          <TextInput value={apiSeason} onChange={(e) => setApiSeason(e.target.value)} placeholder="2026" />
        </div>
      </div>
      <div className="flex gap-2.5">
        <GhostButton onClick={saveSettings} disabled={busy}>
          Save settings
        </GhostButton>
        <GhostButton onClick={syncNow} disabled={busy}>
          Sync fixtures now
        </GhostButton>
      </div>
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

function ManualFixturesPanel({ fixtures, onChange }: { fixtures: AdminFixture[]; onChange: () => void }) {
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
        body: JSON.stringify({ home, away, kickoff: kickoff ? new Date(kickoff).toISOString() : null }),
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

function ResultsPanel({ gameState, onChange }: { gameState: { currentGW: number; phase: string }; onChange: () => void }) {
  const [scorers, setScorers] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (gameState.phase === "finished") {
    return (
      <Panel>
        <PanelTitle>Results</PanelTitle>
        <Sub>This pool has finished. Reset it below to start a new season.</Sub>
      </Panel>
    );
  }

  async function apply() {
    const list = scorers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0 && !confirm("No scorers entered — this eliminates everyone who submitted picks. Continue?")) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/admin/results", { method: "POST", body: JSON.stringify({ scorers: list }) });
      setMsg(`Applied. ${res.eliminated} eliminated. Now on ${res.phase === "finished" ? "finished" : `GW${res.currentGW}`}.`);
      setScorers("");
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
        Type every player who scored this gameweek, comma-separated. Anyone whose all three picks
        are missing from this list goes out.
      </Sub>
      <TextInput
        value={scorers}
        onChange={(e) => setScorers(e.target.value)}
        placeholder="Erling Haaland, Cole Palmer, Virgil van Dijk"
      />
      <div className="mt-3">
        <PrimaryButton onClick={apply} disabled={busy}>
          {busy ? "Applying…" : `Apply results & advance`}
        </PrimaryButton>
      </div>
      {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
    </Panel>
  );
}

function DangerZone({ onChange }: { onChange: () => void }) {
  async function reset() {
    if (!confirm("This wipes every participant, pick and result. Continue?")) return;
    await api("/api/admin/reset", { method: "POST" });
    onChange();
  }
  return (
    <Panel>
      <PanelTitle>Danger zone</PanelTitle>
      <DangerButton onClick={reset}>Reset entire pool</DangerButton>
    </Panel>
  );
}
