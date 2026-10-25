export const stockTimeframes = ["1D", "1W", "1M", "3M", "1Y", "5Y", "MAX"] as const;

export type StockTimeframe = (typeof stockTimeframes)[number];

export const stockTimeframeFreshnessSeconds: Record<StockTimeframe, number> = {
  "1D": 30,
  "1W": 60,
  "1M": 300,
  "3M": 900,
  "1Y": 1_800,
  "5Y": 21_600,
  MAX: 86_400,
};

export interface StockIdentity {
  currency: string;
  exchange: string;
  name: string;
  symbol: string;
}

export interface StockPoint {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number;
}

export interface StockSeries {
  identity: StockIdentity;
  isDemo: boolean;
  points: StockPoint[];
  timeframe: StockTimeframe;
}

/** A watchlist row's latest price, its change today, and a small line of today's prices. */
export interface StockQuote {
  change: number;
  changePercent: number;
  currency: string;
  price: number;
  /** Today's closing prices, thinned to a few dozen points for the row's sparkline. */
  sparkline: number[];
  symbol: string;
}

/** The stock in the open detail sheet and its series for the chosen timeframe. */
export interface StockDetail {
  series: StockSeries | null;
  stock: StockIdentity;
}

export interface StocksLabels {
  added: string;
  addToWatchlist: string;
  afterHours: string;
  attribution: string;
  chart: string;
  chartHelp: string;
  close: string;
  copied: string;
  dataUnavailable: string;
  demo: string;
  description: string;
  emptyWatchlist: string;
  high: string;
  loading: string;
  low: string;
  marketClosed: string;
  marketOpen: string;
  open: string;
  price: string;
  preMarket: string;
  remove: string;
  search: string;
  searchHelp: string;
  searchPlaceholder: string;
  share: string;
  title: string;
  toggleChange: string;
  volume: string;
  watchlist: string;
}
