import { Inter } from "next/font/google";

// Apple devices render the native San Francisco font through -apple-system. Other platforms
// fall back to Inter, the closest open typeface to SF Pro in metrics and character shapes.
export const iosFallbackFont = Inter({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-ios-fallback",
});
