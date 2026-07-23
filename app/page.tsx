"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, TextInput, LoadingScreen } from "@/components/ui";
import type { StateResponse } from "@/lib/types";

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
  eyebrow,
  title,
  description,
  rules,
  href,
  cta,
  comingSoon = false,
  lockedLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  rules: string[];
  href: string;
  cta: string;
  comingSoon?: boolean;
  lockedLabel?: string;
}) {
  const disabled = comingSoon || !!lockedLabel;
  const badgeLabel = lockedLabel || (comingSoon ? "Coming soon" : null);
  const cardClassName = `group flex flex-col bg-panel border border-line rounded-2xl shadow-sm p-6 transition ${
    disabled ? "opacity-70" : "hover:border-accent hover:-translate-y-0.5"
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] tracking-[2px] uppercase text-accent">{eyebrow}</div>
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
        className={`mt-auto font-semibold text-sm rounded-xl px-4 py-2.5 text-center transition ${
          disabled
            ? "bg-bg-deep border border-line-strong text-text-dim"
            : "bg-accent text-white shadow-sm group-hover:brightness-105"
        }`}
      >
        {cta}
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
      <Sub>Enter the 4-digit code the admin gave you to see which pools you can join.</Sub>
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
          {busy ? "…" : "🔑 Log in"}
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
    </Panel>
  );
}

export default function Landing() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api("/api/state");
    setState(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([refresh(), wait(1200)]).finally(() => setLoading(false));
  }, [refresh]);

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

      {loading ? (
        <LoadingScreen label="Checking who's logged in…" />
      ) : !state ? (
        <div className="text-center text-text-dim text-sm py-10">
          Couldn&apos;t load the pool. Refresh to try again.
        </div>
      ) : !state.me ? (
        state.participants.length === 0 ? (
          <Panel>
            <PanelTitle>No players yet</PanelTitle>
            <Sub>
              The admin needs to add players before anyone can log in. Head to{" "}
              <Link href="/admin" className="text-accent underline">
                /admin
              </Link>{" "}
              to add the group and hand out codes.
            </Sub>
          </Panel>
        ) : (
          <LoginPanel onSuccess={refresh} />
        )
      ) : (
        <>
          <div className="flex justify-between items-center mb-5 text-[13px] text-text-dim">
            <span>
              Logged in as <strong className="text-text">{state.me.name}</strong>
            </span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <GameCard
              eyebrow="Player Picks"
              title="Forward, Mid & Def"
              description="Pick a forward, a midfielder and a defender every gameweek — one of them has to find the net or you're out."
              rules={[
                "One player per position, every gameweek",
                "Each player can only be used once all season",
                "Survive as long as one of your three scores",
              ]}
              href="/players"
              cta="Play Player Picks →"
              lockedLabel={state.me.canPlayPlayers ? undefined : "Not in this pool"}
            />
            <GameCard
              eyebrow="Team Survival"
              title="Pick a Team"
              description="Pick one Premier League team each gameweek — if they win, you go through. If they lose, you're out."
              rules={[
                "One team per gameweek, win and you survive",
                "Each team can only be picked once all season",
                "A draw or a loss knocks you out",
              ]}
              href="/teams"
              cta="Coming soon"
              comingSoon
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
