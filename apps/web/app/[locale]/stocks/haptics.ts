export function playStockHaptic(pattern: "select" | "success" | "remove") {
  if (!("vibrate" in navigator)) return;
  const vibrationPatterns: Record<"select" | "success" | "remove", number | number[]> = {
    select: 8,
    success: [8, 35, 12],
    remove: 14,
  };
  navigator.vibrate(vibrationPatterns[pattern]);
}
