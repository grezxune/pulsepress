import { gsap } from "gsap";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { RollingCounter } from "./components/rolling-counter";
import { PRESS_RESPONSE_LINES, TAUNT_LINES } from "./lib/button-voice";

const MESSAGE_VISIBLE_MS = 6_000;
const MESSAGE_GAP_MS = 2_000;
const CLICKS_PER_LEVEL = 6;

type LevelProfile = {
  title: string;
  slide: boolean;
  teleport: boolean;
  camouflage: boolean;
  slideDistancePx: number;
  slideDurationMs: number;
  teleportIntervalMs: number;
  windowOpenMs: number;
  windowCycleMs: number;
};

const LEVEL_PROFILES: LevelProfile[] = [
  {
    title: "Won't get easier",
    slide: false,
    teleport: false,
    camouflage: false,
    slideDistancePx: 0,
    slideDurationMs: 0,
    teleportIntervalMs: 0,
    windowOpenMs: 60_000,
    windowCycleMs: 60_000,
  },
  {
    title: "If this misses, stretch first",
    slide: true,
    teleport: false,
    camouflage: false,
    slideDistancePx: 24,
    slideDurationMs: 1600,
    teleportIntervalMs: 0,
    windowOpenMs: 60_000,
    windowCycleMs: 60_000,
  },
  {
    title: "Now it wanders",
    slide: false,
    teleport: true,
    camouflage: false,
    slideDistancePx: 0,
    slideDurationMs: 0,
    teleportIntervalMs: 5_000,
    windowOpenMs: 60_000,
    windowCycleMs: 60_000,
  },
  {
    title: "Camouflage class begins",
    slide: false,
    teleport: true,
    camouflage: true,
    slideDistancePx: 0,
    slideDurationMs: 0,
    teleportIntervalMs: 4_500,
    windowOpenMs: 5_500,
    windowCycleMs: 8_000,
  },
  {
    title: "Blink and miss",
    slide: true,
    teleport: true,
    camouflage: true,
    slideDistancePx: 30,
    slideDurationMs: 1100,
    teleportIntervalMs: 4_000,
    windowOpenMs: 4_800,
    windowCycleMs: 8_000,
  },
  {
    title: "This one laughs at precision",
    slide: true,
    teleport: true,
    camouflage: true,
    slideDistancePx: 34,
    slideDurationMs: 960,
    teleportIntervalMs: 3_300,
    windowOpenMs: 4_100,
    windowCycleMs: 8_000,
  },
  {
    title: "You wanted hard mode",
    slide: true,
    teleport: true,
    camouflage: true,
    slideDistancePx: 38,
    slideDurationMs: 860,
    teleportIntervalMs: 2_900,
    windowOpenMs: 3_500,
    windowCycleMs: 8_000,
  },
  {
    title: "Tiny target, giant ego",
    slide: true,
    teleport: true,
    camouflage: true,
    slideDistancePx: 42,
    slideDurationMs: 740,
    teleportIntervalMs: 2_500,
    windowOpenMs: 2_900,
    windowCycleMs: 8_000,
  },
  {
    title: "Nerves are now required",
    slide: true,
    teleport: true,
    camouflage: true,
    slideDistancePx: 48,
    slideDurationMs: 680,
    teleportIntervalMs: 2_100,
    windowOpenMs: 2_300,
    windowCycleMs: 8_000,
  },
  {
    title: "Legendary nonsense mode",
    slide: true,
    teleport: true,
    camouflage: true,
    slideDistancePx: 54,
    slideDurationMs: 620,
    teleportIntervalMs: 1_800,
    windowOpenMs: 1_800,
    windowCycleMs: 8_000,
  },
];

function joinClasses(...tokens: Array<string | false>): string {
  return tokens.filter(Boolean).join(" ");
}

/** Main single-screen interaction for the PulseForge counter experiment. */
function App() {
  const stageRef = useRef<HTMLElement>(null);
  const tauntStartTimeoutRef = useRef<number | null>(null);
  const tauntIntervalRef = useRef<number | null>(null);
  const bubbleHideTimeoutRef = useRef<number | null>(null);
  const teleportKickoffTimeoutRef = useRef<number | null>(null);
  const windowCycleKickoffTimeoutRef = useRef<number | null>(null);
  const teleportIntervalRef = useRef<number | null>(null);
  const windowCycleIntervalRef = useRef<number | null>(null);
  const windowCloseTimeoutRef = useRef<number | null>(null);
  const tauntDeckRef = useRef<number[]>([]);
  const responseDeckRef = useRef<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPresses, setPendingPresses] = useState(0);
  const [localPresses, setLocalPresses] = useState(0);
  const [bubbleLine, setBubbleLine] = useState<string | null>(null);
  const [buttonPosition, setButtonPosition] = useState({ x: 50, y: 50 });
  const [isWindowOpen, setIsWindowOpen] = useState(true);

  const counter = useQuery(api.counter.getTotal);
  const highestLevelRecord = useQuery(api.counter.getHighestLevel);
  const increment = useMutation(api.counter.increment);
  const reportHighestLevel = useMutation(api.counter.reportHighestLevel);
  const levelNumber = Math.min(
    LEVEL_PROFILES.length,
    Math.floor(localPresses / CLICKS_PER_LEVEL) + 1,
  );
  const levelProfile = LEVEL_PROFILES[levelNumber - 1] ?? LEVEL_PROFILES[0];
  const highestRecordedLevel = highestLevelRecord?.highestLevel ?? 1;

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

  const randomButtonPosition = useCallback(() => {
    const x = 18 + Math.random() * 64;
    const y = 26 + Math.random() * 48;
    return { x, y };
  }, []);

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

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
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
    }, stage);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    startTauntLoop(MESSAGE_GAP_MS);
    return () => clearVoiceTimers();
  }, [clearVoiceTimers, startTauntLoop]);

  useEffect(() => {
    void reportHighestLevel({ level: levelNumber }).catch(() => undefined);
  }, [levelNumber, reportHighestLevel]);

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

  const handlePress = () => {
    if (!counter || !isWindowOpen) {
      return;
    }

    clearVoiceTimers();
    setLocalPresses((count) => count + 1);

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

  const position = levelProfile.teleport ? buttonPosition : { x: 50, y: 50 };
  const buttonStyle: CSSProperties & Record<string, string> = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    "--slide-distance": `${levelProfile.slideDistancePx}px`,
    "--slide-duration": `${levelProfile.slideDurationMs}ms`,
  };

  return (
    <main ref={stageRef} className="press-root">
      <section className="press-shell" aria-live="polite">
        <div className="press-mark-frame">
          <div className="press-mark-rotor">
            <img src="/logo.png" alt="PulseForge logo" className="press-mark" />
          </div>
        </div>
        <p className="press-label">PulseForge</p>
        <p className="press-level">
          {`Level ${levelNumber} - ${levelProfile.title}`}
        </p>
        <p className="press-stats">
          {`Your Clicks: ${localPresses.toLocaleString("en-US")} · Record Level: ${highestRecordedLevel}`}
        </p>
        {counter ? <RollingCounter value={displayCount} /> : <p className="press-count">...</p>}
        <div className="press-bubble-slot" aria-hidden="true">
          <p className={`press-bubble${bubbleLine ? " is-visible" : ""}`}>
            {bubbleLine ?? ""}
          </p>
        </div>

        <div className="press-action-zone">
          <button
            className={joinClasses(
              "press-button",
              levelProfile.slide && "is-sliding",
              levelProfile.camouflage && "is-camouflage",
              isWindowOpen ? "is-open" : "is-closed",
            )}
            style={buttonStyle}
            type="button"
            onClick={handlePress}
            disabled={!counter || !isWindowOpen}
          >
            Press
          </button>
        </div>

        <p className="press-meta">Global press stream is live.</p>
        <p className="press-description">
          This experiment is a single global count of how many times the button
          has been pressed.
        </p>
        <a
          className="press-github"
          href="https://github.com/grezxune/pulseforge"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View PulseForge on GitHub"
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
    </main>
  );
}

export default App;
