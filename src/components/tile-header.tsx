type LatestWinner = {
  name: string;
  level: number;
} | null;

type TileHeaderProps = {
  isRoundTimerRunning: boolean;
  roundTimeRemainingMs: number;
  roundNumber: number;
  roundTitle: string;
  runClicks: number;
  runBest: number;
  worldRecord: number;
  latestWinner: LatestWinner;
};

/** Branded game-HUD tile header for live round and record stats. */
export function TileHeader({
  isRoundTimerRunning,
  roundTimeRemainingMs,
  roundNumber,
  roundTitle,
  runClicks,
  runBest,
  worldRecord,
  latestWinner,
}: TileHeaderProps) {
  const clockLabel = isRoundTimerRunning ? `${(roundTimeRemainingMs / 1000).toFixed(1)}s` : "Idle";

  return (
    <header className="tile-header" aria-label="Run HUD">
      <div className="tile-header-top">
        <p className="tile-header-kicker">PulsePress Arena</p>
        <p className={`tile-clock${isRoundTimerRunning ? " is-active" : ""}`} aria-live="polite">
          <span className="tile-clock-label">Clock</span>
          <span className="tile-clock-value">{clockLabel}</span>
        </p>
      </div>

      <p className="tile-round" aria-live="polite">
        <span className="tile-round-number">{`Round ${roundNumber}`}</span>
        <span className="tile-round-title">{roundTitle}</span>
      </p>

      <div className="tile-metrics" role="list" aria-label="Run stats">
        <p className="tile-metric" role="listitem">
          <span className="tile-metric-label">Run Clicks</span>
          <span className="tile-metric-value">{runClicks.toLocaleString("en-US")}</span>
        </p>
        <p className="tile-metric" role="listitem">
          <span className="tile-metric-label">Run Best</span>
          <span className="tile-metric-value">{runBest}</span>
        </p>
        <p className="tile-metric" role="listitem">
          <span className="tile-metric-label">World Record</span>
          <span className="tile-metric-value">{worldRecord}</span>
        </p>
      </div>

      <p className="tile-latest-winner">
        <span className="tile-latest-winner-label">Latest Winner</span>
        {latestWinner ? (
          <span className="tile-latest-winner-value">
            <strong>{latestWinner.name}</strong>
            <span>{`Level ${latestWinner.level}`}</span>
          </span>
        ) : (
          <span className="tile-latest-winner-empty">Awaiting first legend</span>
        )}
      </p>
    </header>
  );
}
