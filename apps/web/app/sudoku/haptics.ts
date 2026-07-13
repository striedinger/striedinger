export function triggerHapticFeedback(): void {
  navigator.vibrate?.(10);
}
