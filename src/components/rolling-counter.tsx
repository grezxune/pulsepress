import { type CSSProperties } from "react";
import { formatCount } from "../lib/count-format";

const DIGIT_STRIP = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

type RollingCounterProps = {
  value: number;
};

type CounterToken =
  | {
      kind: "digit";
      char: string;
      placeFromRight: number;
    }
  | {
      kind: "separator";
      char: string;
      index: number;
    };

function isDigit(char: string): boolean {
  return /^[0-9]$/.test(char);
}

function toCounterTokens(formatted: string): CounterToken[] {
  let placeFromRight = formatted.replace(/[^0-9]/g, "").length - 1;

  return formatted.split("").map((char, index) => {
    if (isDigit(char)) {
      const token = { kind: "digit" as const, char, placeFromRight };
      placeFromRight -= 1;
      return token;
    }

    return { kind: "separator" as const, char, index };
  });
}

/** Displays a number with old-school reel motion for each digit. */
export function RollingCounter({ value }: RollingCounterProps) {
  const formatted = formatCount(value);
  const tokens = toCounterTokens(formatted);

  return (
    <p className="press-count" aria-label={formatted}>
      {tokens.map((token) => {
        if (token.kind === "separator") {
          return (
            <span
              key={`separator-${token.index}-${token.char}`}
              className="press-count-separator"
            >
              {token.char}
            </span>
          );
        }

        const reelOffsetPercent = Number.parseInt(token.char, 10) * 10;
        const reelStyle: CSSProperties = {
          transform: `translate3d(0, -${reelOffsetPercent}%, 0)`,
        };

        return (
          <span
            key={`digit-place-${token.placeFromRight}`}
            className="press-count-slot"
            data-place={token.placeFromRight}
          >
            <span className="press-count-reel" style={reelStyle}>
              {DIGIT_STRIP.map((stripDigit, stripIndex) => (
                <span
                  key={`strip-${token.placeFromRight}-${stripIndex}`}
                  className="press-count-step"
                >
                  {stripDigit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </p>
  );
}
