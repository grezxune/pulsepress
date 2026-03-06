import { gsap } from "gsap";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Modal } from "./components/modal";
import { RollingCounter } from "./components/rolling-counter";
import { TileHeader } from "./components/tile-header";
import { PRESS_RESPONSE_LINES, TAUNT_LINES } from "./lib/button-voice";
import { getLevelDifficulty } from "./lib/level-engine";

const MESSAGE_VISIBLE_MS = 6_000;
const MESSAGE_GAP_MS = 2_000;
const ROUND_TIME_LIMIT_MS = 10_000;
const ROUND_TICK_MS = 100;
const DEFAULT_BUTTON_WIDTH_PX = 184;
const DEFAULT_BUTTON_HEIGHT_PX = 58;

type ButtonPosition = {
  x: number;
  y: number;
};

function getViewportCenterPosition(): ButtonPosition {
  if (typeof window === "undefined") {
    return {
      x: DEFAULT_BUTTON_WIDTH_PX / 2,
      y: DEFAULT_BUTTON_HEIGHT_PX / 2,
    };
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

function joinClasses(...tokens: Array<string | false>): string {
  return tokens.filter(Boolean).join(" ");
}

/** Main single-screen interaction for the PulsePress counter experiment. */
function App() {
  const stageRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tauntStartTimeoutRef = useRef<number | null>(null);
  const tauntIntervalRef = useRef<number | null>(null);
  const bubbleHideTimeoutRef = useRef<number | null>(null);
  const teleportKickoffTimeoutRef = useRef<number | null>(null);
  const windowCycleKickoffTimeoutRef = useRef<number | null>(null);
  const teleportIntervalRef = useRef<number | null>(null);
  const windowCycleIntervalRef = useRef<number | null>(null);
  const windowCloseTimeoutRef = useRef<number | null>(null);
  const roundIntervalRef = useRef<number | null>(null);
  const roundDeadlineRef = useRef<number | null>(null);
  const levelRef = useRef(1);
  const highestRoundLevelRef = useRef(1);
  const tauntDeckRef = useRef<number[]>([]);
  const responseDeckRef = useRef<number[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPresses, setPendingPresses] = useState(0);
  const [bubbleLine, setBubbleLine] = useState<string | null>(null);
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition>(() =>
    getViewportCenterPosition(),
  );
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [levelNumber, setLevelNumber] = useState(1);
  const [roundBestLevel, setRoundBestLevel] = useState(1);
  const [roundTimeRemainingMs, setRoundTimeRemainingMs] = useState(ROUND_TIME_LIMIT_MS);
  const [isRoundTimerRunning, setIsRoundTimerRunning] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [winnerErrorMessage, setWinnerErrorMessage] = useState<string | null>(null);
  const [winnerLevelToClaim, setWinnerLevelToClaim] = useState<number | null>(null);
  const [winnerClaimId, setWinnerClaimId] = useState<Id<"winnerClaims"> | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [isSavingWinner, setIsSavingWinner] = useState(false);

  const counter = useQuery(api.counter.getTotal);
  const highestLevelRecord = useQuery(api.counter.getHighestLevel);
  const winners = useQuery(api.counter.getLevelWinners);
  const increment = useMutation(api.counter.increment);
  const reportHighestLevel = useMutation(api.counter.reportHighestLevel);
  const addLevelWinner = useMutation(api.counter.addLevelWinner);

  const levelProfile = useMemo(() => getLevelDifficulty(levelNumber), [levelNumber]);
  const isClickWindowOpen = levelProfile.windowOpenMs >= levelProfile.windowCycleMs || isWindowOpen;
  const highestRecordedLevel = highestLevelRecord?.highestLevel ?? 1;
  const latestWinner = winners?.[0] ?? null;
  const clickCount = Math.max(0, levelNumber - 1);

  const displayCount = useMemo(
    () => (counter?.total ?? 0) + pendingPresses,
    [counter?.total, pendingPresses],
  );

  const drawLineFromDeck = useCallback((lines: string[], deckRef: { current: number[] }) => {
    if (deckRef.current.length === 0) {
      const freshDeck = Array.from({ length: lines.length }, (_, index) => index);

      for (let index = freshDeck.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [freshDeck[index], freshDeck[swapIndex]] = [freshDeck[swapIndex], freshDeck[index]];
      }

      deckRef.current = freshDeck;
    }

    const nextIndex = deckRef.current.shift();
    if (nextIndex === undefined) {
      return lines[0];
    }

    return lines[nextIndex];
  }, []);

  const getNextTaunt = useCallback(
    () => drawLineFromDeck(TAUNT_LINES, tauntDeckRef),
    [drawLineFromDeck],
  );

  const getNextResponse = useCallback(
    () => drawLineFromDeck(PRESS_RESPONSE_LINES, responseDeckRef),
    [drawLineFromDeck],
  );

  const clearVoiceTimers = useCallback(() => {
    if (tauntStartTimeoutRef.current !== null) {
      window.clearTimeout(tauntStartTimeoutRef.current);
      tauntStartTimeoutRef.current = null;
    }

    if (tauntIntervalRef.current !== null) {
      window.clearInterval(tauntIntervalRef.current);
      tauntIntervalRef.current = null;
    }

    if (bubbleHideTimeoutRef.current !== null) {
      window.clearTimeout(bubbleHideTimeoutRef.current);
      bubbleHideTimeoutRef.current = null;
    }
  }, []);

  const clearDifficultyTimers = useCallback(() => {
    if (teleportKickoffTimeoutRef.current !== null) {
      window.clearTimeout(teleportKickoffTimeoutRef.current);
      teleportKickoffTimeoutRef.current = null;
    }

    if (windowCycleKickoffTimeoutRef.current !== null) {
      window.clearTimeout(windowCycleKickoffTimeoutRef.current);
      windowCycleKickoffTimeoutRef.current = null;
    }

    if (teleportIntervalRef.current !== null) {
      window.clearInterval(teleportIntervalRef.current);
      teleportIntervalRef.current = null;
    }

    if (windowCycleIntervalRef.current !== null) {
      window.clearInterval(windowCycleIntervalRef.current);
      windowCycleIntervalRef.current = null;
    }

    if (windowCloseTimeoutRef.current !== null) {
      window.clearTimeout(windowCloseTimeoutRef.current);
      windowCloseTimeoutRef.current = null;
    }
  }, []);

  const stopRoundTimer = useCallback(() => {
    if (roundIntervalRef.current !== null) {
      window.clearInterval(roundIntervalRef.current);
      roundIntervalRef.current = null;
    }

    roundDeadlineRef.current = null;
    setIsRoundTimerRunning(false);
    setRoundTimeRemainingMs(ROUND_TIME_LIMIT_MS);
  }, []);

  const startOrResetRoundTimer = useCallback(() => {
    roundDeadlineRef.current = Date.now() + ROUND_TIME_LIMIT_MS;
    setIsRoundTimerRunning(true);
    setRoundTimeRemainingMs(ROUND_TIME_LIMIT_MS);
  }, []);

  const randomButtonPosition = useCallback((): ButtonPosition => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    const halfWidth = Math.max(
      (buttonRect?.width ?? DEFAULT_BUTTON_WIDTH_PX) / 2 + levelProfile.slideDistancePx,
      8,
    );
    const halfHeight = Math.max((buttonRect?.height ?? DEFAULT_BUTTON_HEIGHT_PX) / 2, 8);
    const travelWidth = Math.max(0, viewportWidth - halfWidth * 2);
    const travelHeight = Math.max(0, viewportHeight - halfHeight * 2);

    return {
      x: halfWidth + Math.random() * travelWidth,
      y: halfHeight + Math.random() * travelHeight,
    };
  }, [levelProfile.slideDistancePx]);

  const showTaunt = useCallback(() => {
    setBubbleLine(getNextTaunt());
    if (bubbleHideTimeoutRef.current !== null) {
      window.clearTimeout(bubbleHideTimeoutRef.current);
    }
    bubbleHideTimeoutRef.current = window.setTimeout(() => {
      setBubbleLine(null);
    }, MESSAGE_VISIBLE_MS);
  }, [getNextTaunt]);

  const startTauntLoop = useCallback(
    (delayMs: number = MESSAGE_GAP_MS) => {
      clearVoiceTimers();
      tauntStartTimeoutRef.current = window.setTimeout(() => {
        showTaunt();
        tauntIntervalRef.current = window.setInterval(showTaunt, MESSAGE_VISIBLE_MS + MESSAGE_GAP_MS);
      }, delayMs);
    },
    [clearVoiceTimers, showTaunt],
  );

  const resetRun = useCallback(() => {
    levelRef.current = 1;
    setLevelNumber(1);
    setRoundBestLevel(1);
    highestRoundLevelRef.current = 1;
    setIsWindowOpen(true);
    setButtonPosition(getViewportCenterPosition());
  }, []);

  const finishRound = useCallback(() => {
    const achievedLevel = highestRoundLevelRef.current;
    stopRoundTimer();
    resetRun();

    if (achievedLevel <= 1) {
      return;
    }

    void reportHighestLevel({ level: achievedLevel })
      .then((result) => {
        if (!result.updated || result.claimId === null) {
          return;
        }

        setWinnerLevelToClaim(result.highestLevel);
        setWinnerClaimId(result.claimId);
        setWinnerName("");
        setWinnerErrorMessage(null);
        setIsWinnerModalOpen(true);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not verify world record. Try again.",
        );
      });
  }, [reportHighestLevel, resetRun, stopRoundTimer]);

  const closeWinnerModal = useCallback(() => {
    setIsWinnerModalOpen(false);
    setWinnerName("");
    setWinnerErrorMessage(null);
    setWinnerLevelToClaim(null);
    setWinnerClaimId(null);
  }, []);

  const handleWinnerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const claimId = winnerClaimId;
    if (claimId === null) {
      return;
    }

    setWinnerErrorMessage(null);
    setIsSavingWinner(true);

    void addLevelWinner({
      claimId,
      name: winnerName,
    })
      .then(() => {
        closeWinnerModal();
      })
      .catch((error) => {
        setWinnerErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not save winner name. Try again.",
        );
      })
      .finally(() => {
        setIsSavingWinner(false);
      });
  };

  useEffect(() => {
    const stage = stageRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!stage) {
      return;
    }

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        gsap.fromTo(
          ".press-shell",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
        );

        gsap.fromTo(
          ".press-mark",
          { scale: 0.92, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.7, delay: 0.1, ease: "power2.out" },
        );
      }

      gsap.to(".press-mark-rotor", {
        rotation: 360,
        duration: prefersReducedMotion ? 12 : 3,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    }, stage);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    startTauntLoop(MESSAGE_GAP_MS);
    return () => clearVoiceTimers();
  }, [clearVoiceTimers, startTauntLoop]);

  useEffect(() => {
    clearDifficultyTimers();

    if (levelProfile.teleport) {
      const moveButton = () => setButtonPosition(randomButtonPosition());
      teleportKickoffTimeoutRef.current = window.setTimeout(moveButton, 0);
      teleportIntervalRef.current = window.setInterval(
        moveButton,
        levelProfile.teleportIntervalMs,
      );
    }

    if (levelProfile.windowOpenMs < levelProfile.windowCycleMs) {
      const runWindowCycle = () => {
        setIsWindowOpen(true);
        if (windowCloseTimeoutRef.current !== null) {
          window.clearTimeout(windowCloseTimeoutRef.current);
        }
        windowCloseTimeoutRef.current = window.setTimeout(() => {
          setIsWindowOpen(false);
        }, levelProfile.windowOpenMs);
      };

      windowCycleKickoffTimeoutRef.current = window.setTimeout(runWindowCycle, 0);
      windowCycleIntervalRef.current = window.setInterval(
        runWindowCycle,
        levelProfile.windowCycleMs,
      );
    }

    return () => clearDifficultyTimers();
  }, [clearDifficultyTimers, levelProfile, randomButtonPosition]);

  useEffect(() => {
    if (!isRoundTimerRunning) {
      return;
    }

    const updateClock = () => {
      const deadline = roundDeadlineRef.current;
      if (deadline === null) {
        return;
      }

      const remainingMs = Math.max(0, deadline - Date.now());
      setRoundTimeRemainingMs(remainingMs);

      if (remainingMs === 0) {
        finishRound();
      }
    };

    updateClock();
    roundIntervalRef.current = window.setInterval(updateClock, ROUND_TICK_MS);

    return () => {
      if (roundIntervalRef.current !== null) {
        window.clearInterval(roundIntervalRef.current);
        roundIntervalRef.current = null;
      }
    };
  }, [finishRound, isRoundTimerRunning]);

  useEffect(
    () => () => {
      clearVoiceTimers();
      clearDifficultyTimers();
      stopRoundTimer();
    },
    [clearDifficultyTimers, clearVoiceTimers, stopRoundTimer],
  );

  const handlePress = () => {
    if (!counter || !isClickWindowOpen || isWinnerModalOpen) {
      return;
    }

    const nextLevel = levelRef.current + 1;
    levelRef.current = nextLevel;
    setLevelNumber(nextLevel);
    setRoundBestLevel((currentBest) => {
      const best = Math.max(currentBest, nextLevel);
      highestRoundLevelRef.current = best;
      return best;
    });
    startOrResetRoundTimer();

    clearVoiceTimers();
    setBubbleLine(getNextResponse());
    bubbleHideTimeoutRef.current = window.setTimeout(() => {
      setBubbleLine(null);
      startTauntLoop(MESSAGE_GAP_MS);
    }, MESSAGE_VISIBLE_MS);

    setErrorMessage(null);
    setPendingPresses((count) => count + 1);

    void increment({})
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not register this press. Try again.",
        );
      })
      .finally(() => {
        setPendingPresses((count) => Math.max(0, count - 1));
      });
  };

  const inTileButtonAnchorStyle: CSSProperties & Record<string, string> = {
    left: "50%",
    top: "50%",
    "--slide-distance": `${levelProfile.slideDistancePx}px`,
    "--slide-duration": `${levelProfile.slideDurationMs}ms`,
  };
  const viewportButtonAnchorStyle: CSSProperties & Record<string, string> = {
    left: `${buttonPosition.x}px`,
    top: `${buttonPosition.y}px`,
    "--slide-distance": `${levelProfile.slideDistancePx}px`,
    "--slide-duration": `${levelProfile.slideDurationMs}ms`,
  };
  const buttonStyle: CSSProperties & Record<string, string> = {
    "--pulse-min-scale": `${levelProfile.pulseMinScale}`,
    "--pulse-duration": `${levelProfile.pulseDurationMs}ms`,
  };
  const buttonAnchorClassName = joinClasses(
    "press-button-anchor",
    levelProfile.slide && "is-sliding",
  );
  const buttonClassName = joinClasses(
    "press-button",
    levelProfile.pulse && "is-pulsing",
    levelProfile.camouflage && "is-camouflage",
    isClickWindowOpen ? "is-open" : "is-closed",
  );
  const pressButtonLabel = isRoundTimerRunning ? `${(roundTimeRemainingMs / 1000).toFixed(1)}s` : "Press";

  const renderPressButton = (anchorStyle: CSSProperties & Record<string, string>) => (
    <div className={buttonAnchorClassName} style={anchorStyle}>
      <button
        ref={buttonRef}
        className={buttonClassName}
        style={buttonStyle}
        type="button"
        onClick={handlePress}
        disabled={!counter || !isClickWindowOpen || isWinnerModalOpen}
      >
        {pressButtonLabel}
      </button>
    </div>
  );

  return (
    <main ref={stageRef} className="press-root">
      <section className="press-shell" aria-live="polite">
        <TileHeader
          isRoundTimerRunning={isRoundTimerRunning}
          roundTimeRemainingMs={roundTimeRemainingMs}
          roundNumber={levelNumber}
          roundTitle={levelProfile.title}
          runClicks={clickCount}
          runBest={roundBestLevel}
          worldRecord={highestRecordedLevel}
          latestWinner={
            latestWinner
              ? {
                  name: latestWinner.name,
                  level: latestWinner.level,
                }
              : null
          }
        />
        <div className="press-mark-frame">
          <div className="press-mark-rotor">
            <img src="/logo.png" alt="PulsePress logo" className="press-mark" />
          </div>
        </div>
        <p className="press-label">Global Press Count</p>
        {counter ? <RollingCounter value={displayCount} /> : <p className="press-count">...</p>}
        <div className="press-bubble-slot" aria-hidden="true">
          <p className={`press-bubble${bubbleLine ? " is-visible" : ""}`}>{bubbleLine ?? ""}</p>
        </div>

        <div className="press-action-zone">
          {!levelProfile.teleport ? renderPressButton(inTileButtonAnchorStyle) : null}
        </div>
        {levelProfile.teleport ? (
          <div className="press-viewport-zone">{renderPressButton(viewportButtonAnchorStyle)}</div>
        ) : null}

        <p className="press-meta">Global press stream is live.</p>
        <p className="press-description">
          One click equals one level. Beat the world record and enter your name when the round timer expires.
        </p>
        <a
          className="press-github"
          href="https://github.com/grezxune/pulsepress"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View PulsePress on GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="press-github-icon">
            <path
              fill="currentColor"
              d="M12 0.3C5.37 0.3 0 5.67 0 12.3C0 17.6 3.44 22.1 8.21 23.68C8.81 23.79 9.03 23.42 9.03 23.1C9.03 22.81 9.02 22.03 9.02 21C5.67 21.73 4.97 19.38 4.97 19.38C4.42 17.99 3.63 17.62 3.63 17.62C2.55 16.88 3.71 16.9 3.71 16.9C4.91 16.98 5.54 18.14 5.54 18.14C6.6 19.96 8.31 19.43 8.99 19.12C9.1 18.35 9.4 17.82 9.74 17.52C7.07 17.22 4.26 16.18 4.26 11.55C4.26 10.23 4.73 9.15 5.52 8.29C5.4 7.99 4.99 6.78 5.64 5.14C5.64 5.14 6.65 4.82 8.99 6.4C9.96 6.13 11 6 12.03 6C13.06 6 14.1 6.13 15.08 6.4C17.41 4.82 18.42 5.14 18.42 5.14C19.07 6.78 18.66 7.99 18.54 8.29C19.33 9.15 19.8 10.23 19.8 11.55C19.8 16.19 16.98 17.22 14.3 17.51C14.73 17.88 15.12 18.62 15.12 19.75C15.12 21.38 15.1 22.69 15.1 23.1C15.1 23.42 15.32 23.8 15.93 23.68C20.7 22.1 24.14 17.6 24.14 12.3C24.14 5.67 18.77 0.3 12.14 0.3H12Z"
            />
          </svg>
          <span>View Source on GitHub</span>
        </a>
        {errorMessage ? <p className="press-error">{errorMessage}</p> : null}
      </section>

      <Modal
        title="World Record Beaten"
        description={
          winnerLevelToClaim
            ? `You set the new world record at Level ${winnerLevelToClaim}. Add your name to the winner list.`
            : "You set a new world record. Add your name to the winner list."
        }
        open={isWinnerModalOpen}
        onClose={closeWinnerModal}
      >
        <form className="winner-form" onSubmit={handleWinnerSubmit}>
          <label className="winner-label" htmlFor="winner-name">
            Winner name
          </label>
          <input
            id="winner-name"
            className="winner-input"
            type="text"
            value={winnerName}
            maxLength={40}
            autoComplete="nickname"
            onChange={(event) => setWinnerName(event.target.value)}
            disabled={isSavingWinner}
          />
          {winnerErrorMessage ? <p className="winner-error">{winnerErrorMessage}</p> : null}
          <button type="submit" className="winner-submit" disabled={isSavingWinner}>
            {isSavingWinner ? "Saving..." : "Save winner"}
          </button>
        </form>
      </Modal>
    </main>
  );
}

export default App;
