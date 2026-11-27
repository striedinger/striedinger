import { Inter } from "next/font/google";

export const iosFallbackFont = Inter({
  display: "swap",
  preload: false,
  subsets: ["latin", "latin-ext"],
  variable: "--font-ios-fallback",
});
