"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelTitle, Sub, PrimaryButton, GhostButton, DangerButton, TextInput, TextArea, Badge } from "@/components/ui";
import { PARTICIPANT_ORDER, ELIMINATED_GW, DEMO_CODES, SCORER_NAMES } from "@/lib/demoData";

const MAX_DEMO_GW = 4;

export default function DemoAdminPage() {
  const [gw, setGw] = useState(1);
  const [scorers, setScorers] = useState(SCORER_NAMES[1].join(", "));
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState(
    PARTICIPANT_ORDER.map((name) => ({
      name,
      status: "alive" as "alive" | "eliminated",
      eliminatedGW: null as number | null,
    }))
  );

  function refreshSuggestions() {
    setScorers((SCORER_NAMES[gw] || []).join(", "));
    setMsg("");
  }

  function apply() {
    const eliminatedNow = players.filter((p) => p.status === "alive" && ELIMINATED_GW[p.name] === gw);
    setPlayers((prev) =>
      prev.map((p) =>
        eliminatedNow.some((e) => e.name === p.name)
          ? { ...p, status: "eliminated", eliminatedGW: gw }
          : p
      )
    );
    const nextGW = gw + 1;
    setMsg(`Applied. ${eliminatedNow.length} eliminated. Now on GW${nextGW}.`);
    setGw(nextGW);
    setScorers((SCORER_NAMES[nextGW] || []).join(", "));
  }

  const stillStanding = players.filter((p) => p.status === "alive").length;
  const atDemoLimit = gw > MAX_DEMO_GW;

  return (
    <div className="max-w-[640px] mx-auto px-4 pb-24 pt-8">
      <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-6 text-[13px] text-center">
        This is a demo of the admin dashboard with made-up players and results — nothing here
        touches your real pool.{" "}
        <Link href="/demo" className="underline font-semibold">
          Back to the demo home →
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl">Admin</h1>
        <GhostButton className="text-[11px] px-3 py-1.5" disabled>
          Log out
        </GhostButton>
      </div>

      <Panel>
        <PanelTitle>Pool status</PanelTitle>
        <div className="flex gap-6 font-mono text-sm text-text-dim">
          <div>
            Gameweek: <span className="text-accent">{Math.min(gw, MAX_DEMO_GW + 1)}</span>
          </div>
          <div>
            Phase: <span className="text-accent">picking</span>
          </div>
          <div>
            Still standing: <span className="text-accent">{stillStanding}</span>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Manage players</PanelTitle>
        <Sub>Add everyone in the group. Each gets a random 4-digit code to log in with.</Sub>
        <div className="flex gap-2.5">
          <TextInput placeholder="Player name" disabled />
          <PrimaryButton disabled>Add player</PrimaryButton>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          {players.map((p) => (
            <div key={p.name} className="flex justify-between items-center bg-bg-deep border border-line rounded-lg px-3.5 py-3">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="font-mono text-[11.5px] text-text-dim">
                  {p.status === "eliminated" ? `Eliminated · GW${p.eliminatedGW}` : "Alive"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="pending">{DEMO_CODES[p.name]}</Badge>
                <span className="text-red text-[11px] font-mono opacity-40">remove</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Results · Gameweek {Math.min(gw, MAX_DEMO_GW + 1)}</PanelTitle>
        {atDemoLimit ? (
          <Sub>
            That&apos;s as far as this demo&apos;s made-up data goes — gameweek {gw} would carry
            on exactly the same way in the real app.
          </Sub>
        ) : (
          <>
            <Sub>
              Scorers are auto-suggested from live match data below — double check the list, then
              edit or add anyone missing before applying. Anyone whose all three picks are missing
              from this list goes out.
            </Sub>
            <TextArea
              value={scorers}
              onChange={(e) => setScorers(e.target.value)}
              placeholder="Erling Haaland, Cole Palmer, Virgil van Dijk"
              rows={5}
            />
            <div className="flex items-center gap-3 mt-2.5">
              <button onClick={refreshSuggestions} className="text-[12px] text-accent hover:underline">
                🔮 Refresh suggestions
              </button>
              <div className="text-[11.5px] text-text-dim">
                Suggested {(SCORER_NAMES[gw] || []).length} scorers from live data — check before applying.
              </div>
            </div>
            <div className="mt-3">
              <PrimaryButton onClick={apply}>Apply results &amp; advance</PrimaryButton>
            </div>
          </>
        )}
        {msg && <div className="text-[13px] text-text-dim mt-2.5">{msg}</div>}
      </Panel>

      <Panel>
        <PanelTitle>Danger zone</PanelTitle>
        <DangerButton disabled>Reset entire pool</DangerButton>
      </Panel>

      <div className="text-center mt-8">
        <Link href="/demo" className="text-text-dim text-[11px] font-mono hover:text-accent">
          ← Back to demo home
        </Link>
      </div>
    </div>
  );
}
