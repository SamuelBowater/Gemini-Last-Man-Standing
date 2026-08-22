"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, TextInput, PasswordInput, Badge, EmptyNote, LoadingScreen } from "@/components/ui";

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
        <Link href="/" className="text-text-dim text-[12px] font-mono hover:text-accent">
          ← Back home
        </Link>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [players, setPlayers] = useState<AdminParticipant[]>([]);
  const [signupCode, setSignupCode] = useState<string | null>(null);
  const [locked, setLocked] = useState(true);
  const [scottishHidden, setScottishHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [playersRes, settingsRes] = await Promise.all([
      api("/api/admin/players"),
      api("/api/admin/settings"),
    ]);
    setPlayers(playersRes.participants);
    setSignupCode(settingsRes.signupCode);
    setLocked(settingsRes.locked);
    setScottishHidden(settingsRes.scottishHidden);
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
        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="font-semibold text-sm rounded-xl px-3 py-1.5 text-[11px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
          >
            🎮 Demo
          </Link>
          <Link
            href="/demo/teams"
            className="font-semibold text-sm rounded-xl px-3 py-1.5 text-[11px] bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent transition inline-flex items-center"
          >
            🎮 Team Demo
          </Link>
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
      </div>

      <SignupCodePanel signupCode={signupCode} onChange={refresh} />
      <PlayersPanel players={players} onChange={refresh} />
      <GamesPanel locked={locked} scottishHidden={scottishHidden} onChange={refresh} />
      <NotificationsPanel />
      <DangerZone onChange={refresh} />

      <div className="text-center mt-8">
        <Link href="/" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back home
        </Link>
      </div>
    </div>
  );
}

function SignupCodePanel({ signupCode, onChange }: { signupCode: string | null; onChange: () => void }) {
  const [code, setCode] = useState(signupCode || "");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local input with fetched value
    setCode(signupCode || "");
  }, [signupCode]);

  async function save() {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter exactly 6 digits.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ signupCode: code }) });
      setMsg("Saved.");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Signup code</PanelTitle>
      <Sub>
        Give this 6-digit code to anyone you want to let sign themselves up on the home page — no
        code, no signup.
      </Sub>
      <div className="flex gap-2.5">
        <TextInput
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="123456"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <PrimaryButton onClick={save} disabled={busy}>
          Save
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
      {msg && <div className="text-text-dim text-[13px] mt-2.5">{msg}</div>}
      {!signupCode && !error && (
        <div className="text-[11.5px] text-red mt-2.5">
          No code set yet — nobody can sign themselves up until you save one.
        </div>
      )}
    </Panel>
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
        Players can sign up themselves on the home page with their own name and PIN. Use this to
        add someone manually instead (they get a random 4-digit code). Tick which pools each
        player is allowed into — some people only want one.
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

function GamesPanel({
  locked,
  scottishHidden,
  onChange,
}: {
  locked: boolean;
  scottishHidden: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [scottishBusy, setScottishBusy] = useState(false);

  async function toggleLocked() {
    setBusy(true);
    try {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ locked: !locked }) });
      onChange();
    } catch {
      // ignore — onChange() will re-fetch and the switch will reflect reality either way
    }
    setBusy(false);
  }

  async function toggleScottishHidden() {
    setScottishBusy(true);
    try {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ scottishHidden: !scottishHidden }) });
      onChange();
    } catch {
      // ignore — onChange() will re-fetch and the switch will reflect reality either way
    }
    setScottishBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Games</PanelTitle>
      <Sub>Results, fixtures and other game-specific settings live on each game&apos;s own admin page.</Sub>

      <div className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 mb-2">
        <div>
          <div className="font-semibold">🔒 Main season locked</div>
          <div className="text-[11.5px] text-text-dim mt-0.5">
            Locks Player Picks &amp; Team Survival together until the real Premier League season
            starts. Signed-up players see a &quot;not open yet&quot; message instead of the pick form.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={locked}
          onClick={toggleLocked}
          disabled={busy}
          className={`shrink-0 ml-3 w-12 h-7 rounded-full relative transition disabled:opacity-50 ${
            locked ? "bg-accent" : "bg-line-strong"
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              locked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 mb-2">
        <div>
          <div className="font-semibold">🏴 Hide Scottish trial</div>
          <div className="text-[11.5px] text-text-dim mt-0.5">
            Removes the Scottish Premiership trial section from the home page entirely. Its data
            and admin pages stay intact — this only hides it from players.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={scottishHidden}
          onClick={toggleScottishHidden}
          disabled={scottishBusy}
          className={`shrink-0 ml-3 w-12 h-7 rounded-full relative transition disabled:opacity-50 ${
            scottishHidden ? "bg-accent" : "bg-line-strong"
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              scottishHidden ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/players/admin"
          className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 hover:border-accent transition"
        >
          <span className="font-semibold">Player Picks admin</span>
          <span className="text-accent text-[12px] font-semibold">→</span>
        </Link>
        <Link
          href="/teams/admin"
          className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 hover:border-accent transition"
        >
          <span className="font-semibold">Team Survival admin</span>
          <span className="text-accent text-[12px] font-semibold">→</span>
        </Link>
        <Link
          href="/scottish/players/admin"
          className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 hover:border-accent transition"
        >
          <span className="font-semibold">🏴 Scottish Player Picks admin</span>
          <span className="text-accent text-[12px] font-semibold">→</span>
        </Link>
        <Link
          href="/scottish/teams/admin"
          className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3 hover:border-accent transition"
        >
          <span className="font-semibold">🏴 Scottish Team Survival admin</span>
          <span className="text-accent text-[12px] font-semibold">→</span>
        </Link>
      </div>
    </Panel>
  );
}

function NotificationsPanel() {
  const [subscribers, setSubscribers] = useState<{ id: number; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const [testBusy, setTestBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendMsg, setSendMsg] = useState("");
  const [sendBusy, setSendBusy] = useState(false);

  const loadSubscribers = useCallback(async () => {
    const res = await api("/api/admin/push-subscribers");
    setSubscribers(res.subscribers);
    setSelectedId((old) => old ?? res.subscribers[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  async function sendTest() {
    if (!selectedId) return;
    setTestBusy(true);
    setTestMsg("");
    try {
      const res = await api("/api/admin/push-test", {
        method: "POST",
        body: JSON.stringify({ participantId: selectedId }),
      });
      setTestMsg(`Sent to ${res.sent}/${res.attempted} device(s).`);
    } catch (e) {
      setTestMsg((e as Error).message);
    }
    setTestBusy(false);
  }

  async function sendToEveryone() {
    if (!title.trim() || !body.trim()) {
      setSendMsg("Enter both a title and a message.");
      return;
    }
    setSendBusy(true);
    setSendMsg("");
    try {
      const res = await api("/api/admin/push-notify", { method: "POST", body: JSON.stringify({ title, body }) });
      setSendMsg(`Sent to ${res.sent}/${res.attempted} device(s).`);
      setTitle("");
      setBody("");
    } catch (e) {
      setSendMsg((e as Error).message);
    }
    setSendBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>🔔 Notifications</PanelTitle>
      <Sub>
        Players enable push notifications themselves from the home page. Test with one player
        before sending an update to everyone.
      </Sub>

      <div className="mb-5">
        <div className="text-[11px] text-text-dim uppercase tracking-wide mb-1.5">Send a test</div>
        {subscribers.length === 0 ? (
          <EmptyNote>No players have enabled notifications yet.</EmptyNote>
        ) : (
          <div className="flex gap-2.5">
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="flex-1 bg-bg-deep border border-line-strong text-text text-[14px] rounded-xl px-3.5 py-3 focus:outline-none focus:border-accent"
            >
              {subscribers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <PrimaryButton onClick={sendTest} disabled={testBusy}>
              {testBusy ? "…" : "Send test"}
            </PrimaryButton>
          </div>
        )}
        {testMsg && <div className="text-[13px] text-text-dim mt-2.5">{testMsg}</div>}
      </div>

      <div>
        <div className="text-[11px] text-text-dim uppercase tracking-wide mb-1.5">Send to everyone</div>
        <div className="flex flex-col gap-2.5">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <TextInput value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" />
          <PrimaryButton onClick={sendToEveryone} disabled={sendBusy}>
            {sendBusy ? "Sending…" : "📤 Send to everyone"}
          </PrimaryButton>
        </div>
        {sendMsg && <div className="text-[13px] text-text-dim mt-2.5">{sendMsg}</div>}
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
