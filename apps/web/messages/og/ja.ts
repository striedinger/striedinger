import type { TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Open Graphプレビュー",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "公開URLを入力して、Open GraphとXのメタデータ、ソーシャルカード、ページ内のタグを確認できます。",
  "URL to preview": "プレビューするURL",
  "https://example.com": "https://example.com",
  "Preview cards": "カードをプレビュー",
  "Previewing {url} ({duration} ms)": "{url} をプレビュー中（{duration} ミリ秒）",
  "Checking…": "確認中…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "標準ポートの公開HTTP(S)ページのみ取得します。プライベートネットワーク、ローカルアドレス、認証情報、過大な応答、安全でないリダイレクトはブロックされます。",
  "Social card previews": "ソーシャルカードのプレビュー",
  "Open Graph preview": "Open Graphプレビュー",
  "X / Twitter card preview": "X / Twitterカードプレビュー",
  "From": "提供元",
  "Detected metadata": "検出されたメタデータ",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "ページのheadから検出された利用可能なすべてのメタタグ、文書タイトル、正規URLです。",
  "Enter a valid absolute URL, including http:// or https://.":
    "http:// または https:// を含む有効な絶対URLを入力してください。",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "そのアドレスは許可されていません。プライベート、ローカル、非標準のネットワーク先はブロックされます。",
  "That page could not be reached within the allowed time.": "制限時間内にページへ接続できませんでした。",
  "The response was not an HTML page.": "応答はHTMLページではありませんでした。",
  "The HTML response was too large to inspect safely.": "HTML応答が大きすぎるため安全に確認できません。",
  "No usable social metadata was found on that page.": "使用可能なソーシャルメタデータが見つかりませんでした。",
  "Too many previews were requested. Please wait a minute and try again.":
    "プレビューのリクエストが多すぎます。1分待ってから再度お試しください。",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "公開URLのOpen GraphとXカードをプレビューし、タイトル、説明、画像、ソーシャルメタデータを高速かつ安全に確認できます。",
  "Test Open Graph and X metadata": "Open GraphとXのメタデータをテスト",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "公開ページを共有した際のタイトル、説明、画像、サイト名、カード形式、検出されたソーシャルタグを確認できます。",
};
