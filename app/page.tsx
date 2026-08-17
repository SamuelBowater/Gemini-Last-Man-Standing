"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, TextInput, Modal } from "@/components/ui";
import { ChangePinPanel } from "@/components/change-pin-panel";
import { NotificationsSetup } from "@/components/notifications-setup";
import type { StateResponse, Participant } from "@/lib/types";

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

function GameCard({
  icon,
  eyebrow,
  title,
  description,
  rules,
  href,
  cta,
  disabledLabel,
  noticeLabel,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  rules: string[];
  href: string;
  cta: string;
  disabledLabel?: string;
  noticeLabel?: string;
}) {
  const disabled = !!disabledLabel;
  const badgeLabel = disabledLabel || noticeLabel || null;
  const cardClassName = `group flex flex-col bg-panel border border-line rounded-2xl shadow-sm p-6 transition ${
    disabled ? "opacity-70" : "hover:border-accent hover:shadow-lg hover:-translate-y-1"
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <div className="font-mono text-[11px] tracking-[2px] uppercase text-accent">{eyebrow}</div>
        </div>
        {badgeLabel && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border text-text-dim border-line-strong bg-bg-deep">
            {badgeLabel}
          </span>
        )}
      </div>
      <h2 className="font-display text-[26px] leading-tight mb-2 text-text">{title}</h2>
      <p className="text-text-dim text-[14px] leading-relaxed mb-4">{description}</p>
      <ul className="flex flex-col gap-1.5 mb-5 text-[13px] text-text-dim">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span className="text-accent">·</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <div
        className={`mt-auto inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-full px-5 py-3 text-center transition ${
          disabled
            ? "bg-bg-deep border border-line-strong text-text-dim"
            : "bg-gradient-to-r from-accent to-emerald-500 text-white shadow-md group-hover:shadow-lg group-hover:brightness-105"
        }`}
      >
        <span>{cta}</span>
        {disabled ? (
          <span>⏳</span>
        ) : (
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        )}
      </div>
    </>
  );

  if (disabled) {
    return <div className={cardClassName}>{content}</div>;
  }
  return (
    <Link href={href} className={cardClassName}>
      {content}
    </Link>
  );
}

function LoginPanel({ participants, onSuccess }: { participants: Participant[]; onSuccess: () => void }) {
  const [selected, setSelected] = useState<Participant | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function selectParticipant(p: Participant) {
    setSelected(p);
    setCode("");
    setError("");
  }

  async function submit() {
    if (!selected) return;
    if (code.length !== 4) {
      setError("Enter all 4 digits.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({ participantId: selected.id, code }) });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  if (!selected) {
    return (
      <Panel>
        <PanelTitle>Log in</PanelTitle>
        {participants.length === 0 ? (
          <Sub>No players yet — head to /admin or sign up above to add the first one.</Sub>
        ) : (
          <>
            <Sub>Tap your name to log in.</Sub>
            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectParticipant(p)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-line-strong bg-bg-deep text-text text-[14px] font-semibold hover:border-accent hover:text-accent transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelTitle>Log in as {selected.name}</PanelTitle>
      <Sub>Enter your 4-digit PIN.</Sub>
      <div className="flex gap-2.5">
        <TextInput
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="0000"
          inputMode="numeric"
          autoFocus
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <PrimaryButton onClick={submit} disabled={busy}>
          {busy ? "…" : "🔑 Log in"}
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="text-text-dim text-[12px] font-mono hover:text-accent mt-3"
      >
        ← Not you?
      </button>
    </Panel>
  );
}

function ToggleChip({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-[13px] font-semibold transition ${
        checked
          ? "bg-accent/10 border-accent text-accent"
          : "bg-bg-deep border-line-strong text-text-dim hover:border-accent/40"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
      <span className={`transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}>✓</span>
    </button>
  );
}

function SignupPanel({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [playPlayers, setPlayPlayers] = useState(true);
  const [playTeams, setPlayTeams] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (pin.length !== 4) {
      setError("Choose a 4-digit PIN.");
      return;
    }
    if (inviteCode.length !== 6) {
      setError("Enter the 6-digit invite code you were given.");
      return;
    }
    if (!playPlayers && !playTeams) {
      setError("Pick at least one pool to join.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/signup", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          pin,
          inviteCode,
          canPlayPlayers: playPlayers,
          canPlayTeams: playTeams,
        }),
      });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>Sign up</PanelTitle>
      <Sub>
        Pick a name, choose your own 4-digit PIN, enter the invite code you were given, and join
        whichever pools you fancy.
      </Sub>
      <div className="flex flex-col gap-2.5">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your name"
        />
        <TextInput
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Choose a 4-digit PIN"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <TextInput
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="6-digit invite code"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <div className="flex gap-2.5">
          <ToggleChip icon="⚽" label="Player Picks" checked={playPlayers} onChange={setPlayPlayers} />
          <ToggleChip icon="🛡️" label="Team Survival" checked={playTeams} onChange={setPlayTeams} />
        </div>
        <PrimaryButton onClick={submit} disabled={busy}>
          {busy ? "…" : "✍️ Sign up"}
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
    </Panel>
  );
}

function AuthPanel({ participants, onSuccess }: { participants: Participant[]; onSuccess: () => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");

  return (
    <div>
      <div className="inline-flex mb-4 border border-line-strong rounded-lg overflow-hidden">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-semibold transition ${
              tab === t ? "bg-accent text-white" : "bg-transparent text-text-dim hover:text-text"
            }`}
          >
            {t === "signup" ? "Sign up" : "Log in"}
          </button>
        ))}
      </div>
      {tab === "signup" ? (
        <SignupPanel onSuccess={onSuccess} />
      ) : (
        <LoginPanel participants={participants} onSuccess={onSuccess} />
      )}
    </div>
  );
}

export default function Landing() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [teamsLocked, setTeamsLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [data, teamData] = await Promise.all([api("/api/state"), api("/api/team-state")]);
      setState(data);
      setTeamsLocked(teamData.gameState.locked);
    } catch {
      // Transient blip (e.g. the database waking from idle) — retry once
      // before giving up, so a brief hiccup doesn't need a manual refresh.
      await wait(1200);
      const [data, teamData] = await Promise.all([api("/api/state"), api("/api/team-state")]);
      setState(data);
      setTeamsLocked(teamData.gameState.locked);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), wait(1200)]).finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4 text-center bg-cover bg-center"
        style={{ backgroundImage: "url(/loading-bg.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/25" />
          <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">⚽</div>
        </div>
        <div className="relative text-white/90 text-[13px] font-mono tracking-wide">
          Checking who&apos;s logged in…
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[880px] mx-auto px-4 pb-24 pt-10">
      <div className="flex justify-end mb-2">
        <Link
          href="/admin"
          className="font-mono text-[11px] text-text-dim hover:text-accent"
        >
          🛠️ Admin →
        </Link>
      </div>

      <div className="text-center pb-8 mb-8 border-b border-line">
        <div className="font-mono text-[12px] tracking-[3px] uppercase text-accent mb-2.5">
          Gemini&apos;s Last Man Standing
        </div>
        <h1 className="font-display text-[46px] leading-[0.95] mb-3 text-text">Pick your pool</h1>
        <p className="text-text-dim text-[15px] max-w-[480px] mx-auto leading-relaxed">
          Two survival pools, one goal: outlast everyone else. Choose which one you&apos;re playing.
        </p>
      </div>

      <NotificationsSetup loggedIn={!!state?.me} />

      {!state ? (
        <div className="text-center text-text-dim text-sm py-10">
          Couldn&apos;t load the pool. Refresh to try again.
        </div>
      ) : !state.me ? (
        <AuthPanel participants={state.participants} onSuccess={refresh} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-5 text-[13px] text-text-dim">
            <span>
              Logged in as <strong className="text-text">{state.me.name}</strong>
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

          <Modal open={pinModalOpen} onClose={() => setPinModalOpen(false)}>
            <ChangePinPanel onClose={() => setPinModalOpen(false)} />
          </Modal>

          {!state.gameState.scottishHidden && (
            <>
              <div className="mb-3 font-mono text-[12px] tracking-[2px] uppercase text-accent">
                🏴 Scottish Premiership — Trial Weekend
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                <GameCard
                  icon="⚽"
                  eyebrow="Trial · Player Picks"
                  title="Forward, Mid & Def"
                  description="Pick a forward, a midfielder and a defender every gameweek — one of them has to find the net or you're out."
                  rules={[
                    "One player per position, every gameweek",
                    "Each player can only be used once all trial",
                    "Survive as long as one of your three scores",
                  ]}
                  href="/scottish/players"
                  cta="Play Player Picks"
                  disabledLabel={state.me.canPlayScotPlayers === false ? "Not in this pool" : undefined}
                />
                <GameCard
                  icon="🛡️"
                  eyebrow="Trial · Team Survival"
                  title="Pick a Team"
                  description="Pick one Scottish Premiership team each gameweek — if they win, you go through. If they lose, you're out."
                  rules={[
                    "One team per gameweek, win and you survive",
                    "Each team can only be picked once all trial",
                    "A draw or a loss knocks you out",
                  ]}
                  href="/scottish/teams"
                  cta="Play Team Survival"
                  disabledLabel={state.me.canPlayScotTeams === false ? "Not in this pool" : undefined}
                />
              </div>
            </>
          )}

          <div className="mb-3 font-mono text-[12px] tracking-[2px] uppercase text-accent">
            ⚽ Premier League — Main Season
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <GameCard
              icon="⚽"
              eyebrow="Player Picks"
              title="Forward, Mid & Def"
              description="Pick a forward, a midfielder and a defender every gameweek — one of them has to find the net or you're out."
              rules={[
                "One player per position, every gameweek",
                "Each player can only be used once all season",
                "Survive as long as one of your three scores",
              ]}
              href="/players"
              cta="Play Player Picks"
              disabledLabel={!state.me.canPlayPlayers ? "Not in this pool" : undefined}
              noticeLabel={state.me.canPlayPlayers && state.gameState.locked ? "🔒 Not open yet" : undefined}
            />
            <GameCard
              icon="🛡️"
              eyebrow="Team Survival"
              title="Pick a Team"
              description="Pick one Premier League team each gameweek — if they win, you go through. If they lose, you're out."
              rules={[
                "One team per gameweek, win and you survive",
                "Each team can only be picked once all season",
                "A draw or a loss knocks you out",
              ]}
              href="/teams"
              cta="Play Team Survival"
              disabledLabel={!state.me.canPlayTeams ? "Not in this pool" : undefined}
              noticeLabel={state.me.canPlayTeams && teamsLocked ? "🔒 Not open yet" : undefined}
            />
          </div>
        </>
      )}

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI&apos;S LAST MAN STANDING · pick wisely, there&apos;s no going back
        <br />
        Created by Samuel Bowater
      </footer>
    </div>
  );
}
