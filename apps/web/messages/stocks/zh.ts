import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";
export const messages: TranslationCatalog<typeof englishMessages> = {
  "Stock watchlist": "股票自选列表",
  "Search, save, and explore market trends across multiple timeframes.":
    "搜索、保存并探索多个时间范围的市场趋势。",
  "Search stocks": "搜索股票",
  "Search by company or ticker": "按公司或代码搜索",
  "Type a company name or symbol. Use arrow keys to browse results.":
    "输入公司名称或代码，使用方向键浏览结果。",
  Watchlist: "自选列表",
  "Your watchlist is empty. Search for a stock to begin.": "自选列表为空。请搜索股票开始使用。",
  Add: "添加",
  Added: "已添加",
  "After hours": "盘后",
  Remove: "移除",
  Close: "关闭",
  "Link copied": "链接已复制",
  "Share chart": "分享图表",
  "Drag across the chart to select a range": "在图表上拖动以选择范围",
  "Reset zoom": "重置缩放",
  Chart: "图表",
  "Drag across the chart or use the left and right arrow keys to inspect prices.":
    "在图表上拖动或使用左右方向键查看价格。",
  "Loading market data": "正在加载市场数据",
  "Market data is temporarily unavailable. Try another timeframe or stock.":
    "市场数据暂时不可用。请尝试其他时间范围或股票。",
  "Demo data": "演示数据",
  Price: "价格",
  Open: "开盘",
  High: "最高",
  Low: "最低",
  "Market closed": "休市",
  "Market open": "交易中",
  "Pre-market": "盘前",
  Volume: "成交量",
  "Market data provided by Twelve Data. Quotes may be delayed and are for informational purposes only.":
    "市场数据由 Twelve Data 提供。报价可能延迟，仅供参考。",
};
