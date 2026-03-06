import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedUseQuery.mockReset();
    mockedUseMutation.mockReset();
  });

  it("renders the global count", async () => {
    mockedUseQuery.mockReturnValue({ total: 9876, shardCount: 128, activeShards: 18 } as never);
    mockedUseMutation.mockReturnValue(vi.fn().mockResolvedValue({ ok: true, shard: 1 }) as never);

    render(<App />);

    expect(screen.getByText("9,876")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Press" })).toBeEnabled();
    });
  });

  it("calls increment mutation on press", async () => {
    const increment = vi.fn().mockResolvedValue({ ok: true, shard: 6 });
    mockedUseQuery.mockReturnValue({ total: 2, shardCount: 128, activeShards: 2 } as never);
    mockedUseMutation.mockReturnValue(increment as never);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Press" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Press" }));

    await waitFor(() => {
      expect(increment).toHaveBeenCalledWith({
        clientId: expect.any(String),
      });
    });
  });
});
