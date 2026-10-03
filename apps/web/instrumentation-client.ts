import { listenForHistoryTraversal } from "./components/ios/ios-history-traversal";

// Native app replicas animate browser back and forward themselves, which needs a popstate
// listener that runs before the App Router's own.
listenForHistoryTraversal();
