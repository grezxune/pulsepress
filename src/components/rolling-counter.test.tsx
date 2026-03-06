import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RollingCounter } from "./rolling-counter";

function queryOnesReel(container: HTMLElement): HTMLElement {
  const reel = container.querySelector('[data-place="0"] .press-count-reel');

  if (!(reel instanceof HTMLElement)) {
    throw new Error("Missing ones-place reel");
  }

  return reel;
}

describe("RollingCounter", () => {
  it("keeps place-value slots stable and updates reel transform when the value changes", () => {
    const { container, rerender } = render(<RollingCounter value={1234} />);
    const onesReelBefore = queryOnesReel(container);

    expect(onesReelBefore.style.transform).toBe("translate3d(0, -40%, 0)");

    rerender(<RollingCounter value={1235} />);

    const onesReelAfter = queryOnesReel(container);

    expect(onesReelAfter).toBe(onesReelBefore);
    expect(onesReelAfter.style.transform).toBe("translate3d(0, -50%, 0)");
  });
});
