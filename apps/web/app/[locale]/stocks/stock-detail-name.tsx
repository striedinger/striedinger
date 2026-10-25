"use client";

import { use } from "react";

import type { StockDetail, StockIdentity } from "./types";

import { resolveDetailStock } from "./resolve-detail-stock";

interface StockDetailNameProps {
  detail: Promise<StockDetail | null> | null;
  stock: StockIdentity;
}

/** The open stock's company name under its ticker in the sheet's header. */
export function StockDetailName({ detail, stock }: StockDetailNameProps) {
  return resolveDetailStock(detail ? use(detail) : undefined, stock).name;
}
