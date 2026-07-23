import Link from "next/link";

function GameCard({
  eyebrow,
  title,
  description,
  rules,
  href,
  cta,
  comingSoon = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  rules: string[];
  href: string;
  cta: string;
  comingSoon?: boolean;
}) {
  const cardClassName = `group flex flex-col bg-panel border border-line rounded-2xl shadow-sm p-6 transition ${
    comingSoon ? "opacity-70" : "hover:border-accent hover:-translate-y-0.5"
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] tracking-[2px] uppercase text-accent">{eyebrow}</div>
        {comingSoon && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border text-text-dim border-line-strong bg-bg-deep">
            Coming soon
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
          comingSoon
            ? "bg-bg-deep border border-line-strong text-text-dim"
            : "bg-accent text-white shadow-sm group-hover:brightness-105"
        }`}
      >
        {cta}
      </div>
    </>
  );

  if (comingSoon) {
    return <div className={cardClassName}>{content}</div>;
  }
  return (
    <Link href={href} className={cardClassName}>
      {content}
    </Link>
  );
}

export default function Landing() {
  return (
    <div className="max-w-[880px] mx-auto px-4 pb-24 pt-10">
      <div className="text-center pb-8 mb-8 border-b border-line">
        <div className="font-mono text-[12px] tracking-[3px] uppercase text-accent mb-2.5">
          Gemini&apos;s Last Man Standing
        </div>
        <h1 className="font-display text-[46px] leading-[0.95] mb-3 text-text">
          Pick your pool
        </h1>
        <p className="text-text-dim text-[15px] max-w-[480px] mx-auto leading-relaxed">
          Two survival pools, one goal: outlast everyone else. Choose which one you&apos;re playing.
        </p>
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

      <footer className="text-center text-text-dim text-[11.5px] mt-10 font-mono">
        GEMINI'S LAST MAN STANDING · pick wisely, there&apos;s no going back
      </footer>
    </div>
  );
}
