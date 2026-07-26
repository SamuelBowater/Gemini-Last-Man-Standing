// Real club crests are trademarked, so this generates a simple placeholder
// badge instead (a colored circle with the club's short code) rather than
// sourcing and embedding actual logos.

const SHORT_CODES: Record<string, string> = {
  "Arsenal FC": "ARS",
  "Aston Villa FC": "AVL",
  "AFC Bournemouth": "BOU",
  "Brentford FC": "BRE",
  "Brighton & Hove Albion FC": "BHA",
  "Burnley FC": "BUR",
  "Chelsea FC": "CHE",
  "Coventry City FC": "COV",
  "Crystal Palace FC": "CRY",
  "Everton FC": "EVE",
  "Fulham FC": "FUL",
  "Hull City AFC": "HUL",
  "Ipswich Town FC": "IPS",
  "Leeds United FC": "LEE",
  "Liverpool FC": "LIV",
  "Manchester City FC": "MCI",
  "Manchester United FC": "MUN",
  "Newcastle United FC": "NEW",
  "Nottingham Forest FC": "NFO",
  "Sunderland AFC": "SUN",
  "Tottenham Hotspur FC": "TOT",
  "West Ham United FC": "WHU",
  "Wolverhampton Wanderers FC": "WOL",
};

function teamCode(name: string): string {
  if (SHORT_CODES[name]) return SHORT_CODES[name];
  const stripped = name.replace(/\b(FC|AFC)\b/gi, "").trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0] + words[1][1]).toUpperCase();
  return stripped.slice(0, 3).toUpperCase();
}

function teamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 55%, 42%)`;
}

export function TeamBadge({ team, size = 32 }: { team: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 leading-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.32),
        backgroundColor: teamColor(team),
      }}
    >
      {teamCode(team)}
    </div>
  );
}
