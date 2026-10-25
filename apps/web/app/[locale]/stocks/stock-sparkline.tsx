interface StockSparklineProps {
  /** The price the day's change is measured from, drawn as a dotted line. */
  baseline: number;
  isUp: boolean;
  values: readonly number[];
}

const width = 64;
const height = 30;
const inset = 1.5;

/** The small line of today's prices in a watchlist row, over a dotted line at the open. */
export function StockSparkline({ baseline, isUp, values }: StockSparklineProps) {
  const minimum = Math.min(baseline, ...values);
  const maximum = Math.max(baseline, ...values);
  const range = maximum - minimum || 1;
  function toY(value: number) {
    return inset + (1 - (value - minimum) / range) * (height - inset * 2);
  }
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const path = values
    .map(function createSegment(value, index) {
      return `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${toY(value).toFixed(1)}`;
    })
    .join("");
  const baselineY = toY(baseline).toFixed(1);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className="h-7.5 w-16 shrink-0 overflow-visible"
    >
      <line
        x1="0"
        x2={width}
        y1={baselineY}
        y2={baselineY}
        className="stroke-ios-tertiary-label"
        strokeDasharray="1 2.5"
        strokeLinecap="round"
        strokeWidth="1"
      />
      <path
        d={path}
        fill="none"
        className={isUp ? "stroke-ios-green" : "stroke-ios-red"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
