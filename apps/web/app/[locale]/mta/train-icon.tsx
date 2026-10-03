const routeColors: Readonly<Record<string, string>> = {
  "1": "#EE352E",
  "2": "#EE352E",
  "3": "#EE352E",
  "4": "#00933C",
  "5": "#00933C",
  "6": "#00933C",
  "7": "#B933AD",
  A: "#0039A6",
  C: "#0039A6",
  E: "#0039A6",
  B: "#FF6319",
  D: "#FF6319",
  F: "#FF6319",
  M: "#FF6319",
  G: "#6CBE45",
  J: "#996633",
  Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A",
  Q: "#FCCC0A",
  R: "#FCCC0A",
  W: "#FCCC0A",
  S: "#808183",
};

const darkTextRoutes = new Set(["N", "Q", "R", "W"]);

interface TrainIconProps {
  route: string;
  size?: "default" | "small";
}

/**
 * An MTA line bullet: the official color and Helvetica lettering, drawn as a vector so the
 * letter sits optically centered at any size, with the soft top highlight and hairline rim
 * of an iOS app icon.
 */
export function TrainIcon({ route, size = "default" }: TrainIconProps) {
  const color = routeColors[route] ?? "#808183";
  const textColor = darkTextRoutes.has(route) ? "#1a1a1a" : "#ffffff";
  const gradientId = `train-bullet-${route}`;

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={`${size === "small" ? "size-[22px]" : "size-8"} shrink-0 drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.18)]`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={color} />
      <circle cx="16" cy="16" r="16" fill={`url(#${gradientId})`} />
      <circle
        cx="16"
        cy="16"
        r="15.6"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.14"
        strokeWidth="0.8"
      />
      <text
        x="16"
        y="16"
        dy="0.36em"
        textAnchor="middle"
        fill={textColor}
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize={route.length > 1 ? 15 : 20}
        fontWeight="700"
        letterSpacing="-0.4"
      >
        {route}
      </text>
    </svg>
  );
}
