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

export function TrainIcon({
  route,
  size = "default",
}: {
  route: string;
  size?: "default" | "small";
}) {
  const lightText = !["N", "Q", "R", "W"].includes(route);
  return (
    <span
      className={`${size === "small" ? "size-6" : "size-8"} ${routeColors[route] ?? "bg-neutral-500"} inline-flex shrink-0 items-center justify-center rounded-full shadow-sm`}
    >
      <Text
        as="span"
        family="sans"
        size={size === "small" ? "xs" : "sm"}
        weight="bold"
        className={lightText ? "text-white" : "text-black"}
      >
        {route}
      </Text>
    </span>
  );
}
