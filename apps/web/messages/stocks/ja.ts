import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";
export const messages: TranslationCatalog<typeof englishMessages> = {
  "Stock watchlist": "株式ウォッチリスト",
  "Search, save, and explore market trends across multiple timeframes.":
    "株式を検索・保存し、複数の期間で市場動向を確認できます。",
  "Search stocks": "株式を検索",
  "Search by company or ticker": "会社名または銘柄コードで検索",
  "Type a company name or symbol. Use arrow keys to browse results.":
    "会社名またはコードを入力し、矢印キーで結果を移動します。",
  Watchlist: "ウォッチリスト",
  "Your watchlist is empty. Search for a stock to begin.":
    "ウォッチリストは空です。株式を検索して始めましょう。",
  Add: "追加",
  Added: "追加済み",
  "After hours": "時間外取引",
  Remove: "削除",
  Close: "閉じる",
  "Link copied": "リンクをコピーしました",
  "Share chart": "チャートを共有",
  "Drag across the chart to select a range": "チャート上をドラッグして範囲を選択",
  "Reset zoom": "ズームをリセット",
  Chart: "チャート",
  "Drag across the chart or use the left and right arrow keys to inspect prices.":
    "チャートをドラッグするか左右キーで価格を確認します。",
  "Loading market data": "市場データを読み込み中",
  "Market data is temporarily unavailable. Try another timeframe or stock.":
    "市場データを一時的に利用できません。別の期間または株式をお試しください。",
  "Demo data": "デモデータ",
  Price: "価格",
  Open: "始値",
  High: "高値",
  Low: "安値",
  "Market closed": "市場終了",
  "Market open": "市場取引中",
  "Pre-market": "プレマーケット",
  Volume: "出来高",
  "Market data provided by Twelve Data. Quotes may be delayed and are for informational purposes only.":
    "市場データは Twelve Data 提供です。価格は遅延する場合があり、情報提供のみを目的とします。",
};
