import type { StockIdentity } from "./types";

export const spaceXStock: StockIdentity = {
  symbol: "SPCX",
  name: "Space Exploration Technologies Corp. Class A",
  exchange: "NASDAQ",
  currency: "USD",
};

export const defaultStocks: StockIdentity[] = [
  { symbol: "AAPL", name: "Apple", exchange: "NASDAQ", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ", currency: "USD" },
  spaceXStock,
];

export const featuredStocks: StockIdentity[] = [
  spaceXStock,
  ...defaultStocks.slice(0, 3),
  { symbol: "AMZN", name: "Amazon", exchange: "NASDAQ", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet", exchange: "NASDAQ", currency: "USD" },
  { symbol: "META", name: "Meta Platforms", exchange: "NASDAQ", currency: "USD" },
  { symbol: "TSLA", name: "Tesla", exchange: "NASDAQ", currency: "USD" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", exchange: "NYSE", currency: "USD" },
];
