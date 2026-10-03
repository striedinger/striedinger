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
 * An MTA line bullet: a flat disc in the official color with Helvetica lettering, drawn as a
 * vector so the letter sits optically centered at any size.
 */
export function TrainIcon({ route, size = "default" }: TrainIconProps) {
  const color = routeColors[route] ?? "#808183";
  const textColor = darkTextRoutes.has(route) ? "#1a1a1a" : "#ffffff";

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={`${size === "small" ? "size-[22px]" : "size-8"} shrink-0`}
    >
      <circle cx="16" cy="16" r="16" fill={color} />
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
