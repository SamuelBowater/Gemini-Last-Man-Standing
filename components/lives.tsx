/** Hearts for a player's remaining lives: ❤️ for each one left, 🖤 for each one lost. */
export function Lives({ left, total, className = "" }: { left: number; total: number; className?: string }) {
  const lost = Math.max(0, total - left);
  return (
    <span
      className={`inline-flex gap-0.5 leading-none ${className}`}
      role="img"
      aria-label={`${left} of ${total} lives left`}
      title={`${left} of ${total} lives left`}
    >
      {Array.from({ length: left }, (_, i) => (
        <span key={`l${i}`}>❤️</span>
      ))}
      {Array.from({ length: lost }, (_, i) => (
        <span key={`x${i}`}>🖤</span>
      ))}
    </span>
  );
}
