import type { Viewport } from "next";
import type { ReactNode } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { sudokuFrameClassName } from "./sudoku-frame";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Sudoku runs full screen like an installed iOS game. */
export default function SudokuLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <IosAppFrame className={sudokuFrameClassName}>{children}</IosAppFrame>;
}
