import Link from "next/link";
import { Panel, PanelTitle, Sub } from "@/components/ui";

export default function TeamSurvival() {
  return (
    <div className="max-w-[600px] mx-auto px-4 pb-24 pt-10 text-center">
      <Link href="/" className="inline-block font-mono text-[11px] text-text-dim hover:text-accent mb-6">
        ← All games
      </Link>
      <div className="font-mono text-[12px] tracking-[3px] uppercase text-accent mb-2.5">
        Team Survival
      </div>
      <h1 className="font-display text-[38px] leading-[0.95] mb-6 text-text">Coming soon</h1>
      <Panel className="text-left">
        <PanelTitle>How it&apos;ll work</PanelTitle>
        <Sub>
          Pick one Premier League team each gameweek. If they win, you survive. If they draw or
          lose, you&apos;re out — and once you&apos;ve picked a team, it&apos;s off the table for
          the rest of the season.
        </Sub>
      </Panel>
    </div>
  );
}
