import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import App from "./App";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("gsap", () => ({
  gsap: {
    context: (callback: () => void) => {
      callback();
      return { revert: () => undefined };
    },
    fromTo: vi.fn(),
    to: vi.fn(),
  },
}));

const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQuery = vi.mocked(useQuery);

type WinnerEntry = {
  _id: string;
  name: string;
  level: number;
  createdAt: number;
};

function setupConvexMocks(params: {
  total: number;
  activeShards?: number;
  highestLevel?: number;
  winners?: WinnerEntry[];
  increment?: ReturnType<typeof vi.fn>;
  report?: ReturnType<typeof vi.fn>;
  addWinner?: ReturnType<typeof vi.fn>;
}) {
  const counterSnapshot = {
    total: params.total,
    shardCount: 128,
    activeShards: params.activeShards ?? 1,
  };
  const recordSnapshot = {
    highestLevel: params.highestLevel ?? 1,
    updatedAt: null,
  };
  const winnersSnapshot = params.winners ?? [];

  const incrementMutation =
    params.increment ?? vi.fn().mockResolvedValue({ ok: true, shard: 1 });
  const reportMutation =
    params.report ??
    vi.fn().mockResolvedValue({
      highestLevel: recordSnapshot.highestLevel,
      updated: false,
      claimId: null,
    });
  const addWinnerMutation =
    params.addWinner ?? vi.fn().mockResolvedValue({ saved: true });

  let queryCallCount = 0;
  mockedUseQuery.mockImplementation(() => {
    queryCallCount += 1;
    const querySlot = (queryCallCount - 1) % 3;

    if (querySlot === 0) {
      return counterSnapshot as never;
    }

    if (querySlot === 1) {
      return recordSnapshot as never;
    }

    return winnersSnapshot as never;
  });

  let mutationCallCount = 0;
  mockedUseMutation.mockImplementation(() => {
    mutationCallCount += 1;
    const mutationSlot = (mutationCallCount - 1) % 3;

    if (mutationSlot === 0) {
      return incrementMutation as never;
    }

    if (mutationSlot === 1) {
      return reportMutation as never;
    }

    return addWinnerMutation as never;
  });

  return {
    incrementMutation,
    reportMutation,
    addWinnerMutation,
  };
}

describe("App", () => {
  beforeEach(() => {
    mockedUseQuery.mockReset();
    mockedUseMutation.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders count, round status, and winner summary", async () => {
    setupConvexMocks({
      total: 9876,
      activeShards: 18,
      highestLevel: 7,
      winners: [
        {
          _id: "winner_1",
          name: "Ada",
          level: 7,
          createdAt: 123,
        },
      ],
    });

    render(<App />);

    const hud = screen.getByLabelText("Run HUD");

    expect(screen.getByLabelText("9,876")).toBeInTheDocument();
    expect(within(hud).getByText("Idle")).toBeInTheDocument();
    expect(within(hud).getByText("Round 1")).toBeInTheDocument();
    expect(within(hud).getByText("Won't get easier")).toBeInTheDocument();
    expect(within(hud).getByText("Run Clicks")).toBeInTheDocument();
    expect(within(hud).getByText("Run Best")).toBeInTheDocument();
    expect(within(hud).getByText("World Record")).toBeInTheDocument();
    expect(within(hud).getByText("Ada")).toBeInTheDocument();
    expect(within(hud).getByText("Level 7")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Press" })).toBeEnabled();
    });
  });

  it("increments and advances one level per click", async () => {
    const increment = vi.fn().mockResolvedValue({ ok: true, shard: 6 });
    setupConvexMocks({
      total: 2,
      activeShards: 2,
      highestLevel: 3,
      increment,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Press" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Press" }));

    await waitFor(() => {
      expect(increment).toHaveBeenCalledWith({});
    });

    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByText("If this misses, stretch first")).toBeInTheDocument();
    expect(screen.getByText("10.0s")).toBeInTheDocument();
  });

  it("resets to round 1 and stops the clock when the round timer expires", async () => {
    vi.useFakeTimers();
    const report = vi.fn().mockResolvedValue({ highestLevel: 2, updated: false });
    setupConvexMocks({
      total: 42,
      highestLevel: 9,
      report,
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByText("If this misses, stretch first")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_200);
      await Promise.resolve();
    });

    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Won't get easier")).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith({ level: 2 });
  });

  it("opens winner modal after world-record timeout and saves winner name", async () => {
    vi.useFakeTimers();
    const report = vi.fn().mockResolvedValue({
      highestLevel: 12,
      updated: true,
      claimId: "claim_12",
    });
    const addWinner = vi.fn().mockResolvedValue({ saved: true });
    setupConvexMocks({
      total: 100,
      highestLevel: 5,
      report,
      addWinner,
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Press" }));

    await act(async () => {
      vi.advanceTimersByTime(10_200);
      await Promise.resolve();
    });

    expect(screen.getByRole("dialog", { name: "World Record Beaten" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Winner name"), {
      target: { value: "Tommy" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save winner" }));
      await Promise.resolve();
    });

    expect(addWinner).toHaveBeenCalledWith({
      claimId: "claim_12",
      name: "Tommy",
    });
  });
});
