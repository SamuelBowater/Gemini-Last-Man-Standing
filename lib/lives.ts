export interface LivesStatus {
  /** Lives lost up to and including the gameweek asked about. */
  lost: number;
  livesLeft: number;
  /** The gameweek the final life went, or null while the player is still in. */
  eliminatedGW: number | null;
  /** True if a life (including the final one) was lost in exactly the gameweek asked about. */
  lostThisGW: boolean;
}

/**
 * Lives for one player as of `asOfGW`, from the gameweeks they lost a life in
 * (one per gameweek at most). Pass only losses from the game's current era —
 * a rollover or restarted game starts a new era with full lives for everyone.
 */
export function computeLives(lossGWs: number[], livesTotal: number, asOfGW: number): LivesStatus {
  const losses = lossGWs.filter((gw) => gw <= asOfGW).sort((a, b) => a - b);
  const lost = losses.length;
  return {
    lost,
    livesLeft: Math.max(0, livesTotal - lost),
    eliminatedGW: lost >= livesTotal ? losses[livesTotal - 1] : null,
    lostThisGW: losses.includes(asOfGW),
  };
}
