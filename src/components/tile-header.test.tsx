import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TileHeader } from "./tile-header";

describe("TileHeader", () => {
  it("renders all core HUD stats and active clock", () => {
    render(
      <TileHeader
        isRoundTimerRunning
        roundTimeRemainingMs={9_300}
        roundNumber={4}
        roundTitle="Blink and miss"
        runClicks={3}
        runBest={6}
        worldRecord={12}
        latestWinner={{ name: "Rae", level: 12 }}
      />,
    );

    expect(screen.getByText("Clock")).toBeInTheDocument();
    expect(screen.getByText("9.3s")).toBeInTheDocument();
    expect(screen.getByText("Round 4")).toBeInTheDocument();
    expect(screen.getByText("Blink and miss")).toBeInTheDocument();
    expect(screen.getByText("Run Clicks")).toBeInTheDocument();
    expect(screen.getByText("Run Best")).toBeInTheDocument();
    expect(screen.getByText("World Record")).toBeInTheDocument();
    expect(screen.getByText("Rae")).toBeInTheDocument();
    expect(screen.getByText("Level 12")).toBeInTheDocument();
  });

  it("shows empty winner state when no winner exists", () => {
    render(
      <TileHeader
        isRoundTimerRunning={false}
        roundTimeRemainingMs={10_000}
        roundNumber={1}
        roundTitle="Won't get easier"
        runClicks={0}
        runBest={1}
        worldRecord={1}
        latestWinner={null}
      />,
    );

    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("Awaiting first legend")).toBeInTheDocument();
  });
});
