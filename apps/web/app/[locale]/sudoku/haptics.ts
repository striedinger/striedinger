export function triggerHapticFeedback(): void {
  if (typeof navigator.vibrate === "function") navigator.vibrate(10);
}
