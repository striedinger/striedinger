export function triggerHapticFeedback(): void {
  // Safari does not implement the Vibration API.
  if (typeof navigator.vibrate === "function") navigator.vibrate(10);
}
