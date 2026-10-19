import { useSyncExternalStore } from "react";

/**
 * The playhead, kept outside React state. Playback moves it every animation frame, so only the
 * few components that show the time subscribe, rather than the whole editor re-rendering.
 */
export interface PlayheadStore {
  get: () => number;
  set: (time: number) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createPlayheadStore(): PlayheadStore {
  let time = 0;
  const listeners = new Set<() => void>();
  return {
    get() {
      return time;
    },
    set(nextTime) {
      if (nextTime === time) return;
      time = nextTime;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    },
  };
}

export function usePlayheadTime(store: PlayheadStore) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * A value derived from the playhead that re-renders only when it changes, such as which caption
 * is showing. `select` must return a primitive or an object that stays the same between frames.
 */
export function usePlayheadSelection<Selection>(
  store: PlayheadStore,
  select: (time: number) => Selection,
) {
  function getSelection() {
    return select(store.get());
  }
  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}
