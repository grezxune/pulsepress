import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function setupConvexMocks(params: {
  total: number;
  activeShards?: number;
  highestLevel?: number;
  increment?: ReturnType<typeof vi.fn>;
  report?: ReturnType<typeof vi.fn>;
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
  const incrementMutation =
    params.increment ?? vi.fn().mockResolvedValue({ ok: true, shard: 1 });
  const reportMutation =
    params.report ?? vi.fn().mockResolvedValue({ highestLevel: 1, updated: false });

  let queryCallCount = 0;
  mockedUseQuery.mockImplementation(() => {
    queryCallCount += 1;
    return (queryCallCount % 2 === 1 ? counterSnapshot : recordSnapshot) as never;
  });

  let mutationHookCallCount = 0;
  mockedUseMutation.mockImplementation(() => {
    mutationHookCallCount += 1;
    return (mutationHookCallCount % 2 === 1 ? incrementMutation : reportMutation) as never;
  });

  return {
    incrementMutation,
    reportMutation,
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

  it("renders the global count", async () => {
    setupConvexMocks({
      total: 9876,
      activeShards: 18,
      highestLevel: 7,
    });

    render(<App />);

    expect(screen.getByLabelText("9,876")).toBeInTheDocument();
    expect(
      screen.getByText("Your Clicks: 0 · Record Level: 7"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Press" })).toBeEnabled();
    });
  });

  it("calls increment mutation on press", async () => {
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
  });

  it("uses 6-second message windows with 2-second silent gaps", async () => {
    vi.useFakeTimers();
    setupConvexMocks({
      total: 42,
      activeShards: 14,
      highestLevel: 9,
      increment: vi.fn().mockResolvedValue({ ok: true, shard: 3 }),
    });

    const { container } = render(<App />);
    const bubble = container.querySelector(".press-bubble");

    expect(bubble?.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(2_100);
    });
    const firstTaunt = bubble?.textContent;

    expect(firstTaunt).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5_800);
    });
    expect(bubble?.textContent).toBe(firstTaunt);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(bubble?.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(2_100);
    });
    const secondTaunt = bubble?.textContent;

    expect(secondTaunt).toBeTruthy();
    expect(secondTaunt).not.toBe(firstTaunt);

    fireEvent.click(screen.getByRole("button", { name: "Press" }));
    const clickResponse = bubble?.textContent;

    expect(clickResponse).toBeTruthy();
    expect(clickResponse).not.toBe(secondTaunt);

    act(() => {
      vi.advanceTimersByTime(5_800);
    });
    expect(bubble?.textContent).toBe(clickResponse);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(bubble?.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(2_100);
    });
    expect(bubble?.textContent).not.toBe(clickResponse);
  });
});
