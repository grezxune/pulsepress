import { type CSSProperties } from "react";
import { formatCount } from "../lib/count-format";

const DIGIT_STRIP = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

type RollingCounterProps = {
  value: number;
};

function isDigit(char: string): boolean {
  return /^[0-9]$/.test(char);
}

/** Displays a number with old-school reel motion for each digit. */
export function RollingCounter({ value }: RollingCounterProps) {
  const formatted = formatCount(value);

  return (
    <p className="press-count" aria-label={formatted}>
      {formatted.split("").map((char, index) => {
        if (!isDigit(char)) {
          return (
            <span key={`separator-${index}`} className="press-count-separator">
              {char}
            </span>
          );
        }

        const reelStyle: CSSProperties & Record<"--digit-index", string> = {
          "--digit-index": char,
        };

        return (
          <span key={`digit-${index}`} className="press-count-slot">
            <span className="press-count-reel" style={reelStyle}>
              {DIGIT_STRIP.map((stripDigit, stripIndex) => (
                <span
                  key={`strip-${index}-${stripIndex}`}
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
