type HistoryTraversalHandler = (event: PopStateEvent) => void;

interface HistoryTraversalRegistry {
  handlers: Set<HistoryTraversalHandler>;
  isListening: boolean;
}

const registryKey = "iosHistoryTraversalRegistry";

/**
 * Shared through the global object because `instrumentation-client.ts`, which installs the
 * listener, and the app's chunks may each evaluate this module.
 */
function getRegistry(): HistoryTraversalRegistry {
  const host = globalThis as typeof globalThis & { [registryKey]?: HistoryTraversalRegistry };
  host[registryKey] ??= { handlers: new Set(), isListening: false };
  return host[registryKey];
}

function runHandlers(event: PopStateEvent) {
  for (const handler of getRegistry().handlers) handler(event);
}

/**
 * Listens for browser back and forward before the Next.js router does. Listeners on the
 * window run in the order they were added, whatever their phase, so this runs from
 * `instrumentation-client.ts`, ahead of the router, letting a handler take over a traversal.
 */
export function listenForHistoryTraversal() {
  const registry = getRegistry();
  if (registry.isListening) return;
  registry.isListening = true;
  window.addEventListener("popstate", runHandlers);
}

/** Runs `handler` for each history traversal, before the router handles it. */
export function handleHistoryTraversal(handler: HistoryTraversalHandler) {
  listenForHistoryTraversal();
  const { handlers } = getRegistry();
  handlers.add(handler);
  return function stopHandlingHistoryTraversal() {
    handlers.delete(handler);
  };
}
