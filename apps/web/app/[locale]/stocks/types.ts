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

export interface StocksLabels {
  add: string;
  added: string;
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
  rangeHelp: string;
  remove: string;
  resetZoom: string;
  search: string;
  searchHelp: string;
  searchPlaceholder: string;
  share: string;
  title: string;
  volume: string;
  watchlist: string;
}
