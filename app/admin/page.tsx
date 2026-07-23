"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, TextInput, Badge, EmptyNote, LoadingScreen } from "@/components/ui";

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

interface AdminParticipant {
  id: number;
  name: string;
  code: string;
  status: "alive" | "eliminated";
  eliminatedGW: number | null;
  canPlayPlayers: boolean;
  canPlayTeams: boolean;
}

export default function AdminPage() {
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
        <Link href="/" className="text-text-dim text-[12px] font-mono hover:text-accent">
          ← Back home
        </Link>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [players, setPlayers] = useState<AdminParticipant[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const playersRes = await api("/api/admin/players");
    setPlayers(playersRes.participants);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), wait(2000)]).finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) {
    return (
      <div className="max-w-[640px] mx-auto px-4">
        <LoadingScreen label="Loading the admin dashboard…" />
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 pb-24 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl">Admin</h1>
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

      <PlayersPanel players={players} onChange={refresh} />
      <GamesPanel />
      <DangerZone onChange={refresh} />

      <div className="text-center mt-8">
        <Link href="/" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back home
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

  async function setAccess(p: AdminParticipant, changes: Partial<Pick<AdminParticipant, "canPlayPlayers" | "canPlayTeams">>) {
    await api("/api/admin/players", {
      method: "PATCH",
      body: JSON.stringify({
        id: p.id,
        canPlayPlayers: p.canPlayPlayers,
        canPlayTeams: p.canPlayTeams,
        ...changes,
      }),
    });
    onChange();
  }

  return (
    <Panel>
      <PanelTitle>Manage players</PanelTitle>
      <Sub>
        Add everyone in the group. Each gets a random 4-digit code to log in with. Tick which
        pools each player is allowed into — some people only want one.
      </Sub>
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
          <div key={p.id} className="bg-bg-deep border border-line rounded-lg px-3.5 py-3">
            <div className="flex justify-between items-center">
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
            <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-line">
              <label className="flex items-center gap-1.5 text-[12px] text-text-dim cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.canPlayPlayers}
                  onChange={(e) => setAccess(p, { canPlayPlayers: e.target.checked })}
                />
                Player Picks
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-text-dim cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.canPlayTeams}
                  onChange={(e) => setAccess(p, { canPlayTeams: e.target.checked })}
                />
                Team Survival
              </label>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function GamesPanel() {
  return (
    <Panel>
      <PanelTitle>Games</PanelTitle>
      <Sub>Results, fixtures and other game-specific settings live on each game&apos;s own admin page.</Sub>
      <div className="flex flex-col gap-2">
        <Link
          href="/players/admin"
          className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 hover:border-accent transition"
        >
          <span className="font-semibold">Player Picks admin</span>
          <span className="text-accent text-[12px] font-semibold">→</span>
        </Link>
        <div className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 opacity-60">
          <span className="font-semibold">Team Survival admin</span>
          <span className="text-text-dim text-[11px] font-mono">Coming soon</span>
        </div>
      </div>
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
