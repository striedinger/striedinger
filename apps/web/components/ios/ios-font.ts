import { Inter } from "next/font/google";

// Apple devices render the native San Francisco font through -apple-system. Other platforms
// fall back to Inter, the closest open typeface to SF Pro in metrics and character shapes.
// It is not preloaded: browsers fetch a web font only when the stack reaches it, so iPhones and
// Macs, which never do, skip the download entirely.
export const iosFallbackFont = Inter({
  display: "swap",
  preload: false,
  subsets: ["latin", "latin-ext"],
  variable: "--font-ios-fallback",
});
