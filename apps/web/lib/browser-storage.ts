// Storage is optional: privacy settings and quota limits must not interrupt local tools.
export function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The caller's in-memory state remains usable without persistence.
  }
}

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable even when removing a corrupt entry.
  }
}
