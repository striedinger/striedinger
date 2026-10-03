import { Text } from "@workspace/ui/components/text";

const routeColors: Readonly<Record<string, string>> = {
  "1": "bg-[#EE352E]",
  "2": "bg-[#EE352E]",
  "3": "bg-[#EE352E]",
  "4": "bg-[#00933C]",
  "5": "bg-[#00933C]",
  "6": "bg-[#00933C]",
  "7": "bg-[#B933AD]",
  A: "bg-[#0039A6]",
  C: "bg-[#0039A6]",
  E: "bg-[#0039A6]",
  B: "bg-[#FF6319]",
  D: "bg-[#FF6319]",
  F: "bg-[#FF6319]",
  M: "bg-[#FF6319]",
  G: "bg-[#6CBE45]",
  J: "bg-[#996633]",
  Z: "bg-[#996633]",
  L: "bg-[#A7A9AC]",
  N: "bg-[#FCCC0A]",
  Q: "bg-[#FCCC0A]",
  R: "bg-[#FCCC0A]",
  W: "bg-[#FCCC0A]",
  S: "bg-[#808183]",
};

const darkTextRoutes = new Set(["N", "Q", "R", "W"]);

/** An MTA line bullet in the line's official color. */
export function TrainIcon({
  route,
  size = "default",
}: {
  route: string;
  size?: "default" | "small";
}) {
  return (
    <span
      className={`${size === "small" ? "size-[22px] text-[12px]" : "size-8 text-[16px]"} ${routeColors[route] ?? "bg-neutral-500"} inline-flex shrink-0 items-center justify-center rounded-full`}
    >
      <Text
        as="span"
        family="sans"
        className={`leading-none font-bold text-inherit ${darkTextRoutes.has(route) ? "text-black" : "text-white"}`}
      >
        {route}
      </Text>
    </span>
  );
}
