"use client";

import { createContext, use } from "react";

export interface IosAppSwitcherLabels {
  apps: string;
  chat: string;
  close: string;
  home: string;
  image: string;
  ip: string;
  javascript: string;
  json: string;
  navigation: string;
  notes: string;
  og: string;
  open: string;
  pdf: string;
  podcasts: string;
  stocks: string;
  sudoku: string;
  tools: string;
  trains: string;
}

interface IosAppSwitcherContextValue {
  labels: IosAppSwitcherLabels;
  openAppSwitcher: () => void;
  /** Starts downloading the sheet ahead of a likely tap. */
  prepareAppSwitcher: () => void;
}

export const IosAppSwitcherContext = createContext<IosAppSwitcherContextValue | null>(null);

export function useIosAppSwitcher() {
  return use(IosAppSwitcherContext);
}
