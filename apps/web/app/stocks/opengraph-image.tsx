import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getStocksTranslator } from "../../messages/stocks/get-translator";
import { getRouteLocale } from "../get-request-locale";

export const alt = "Stock watchlist";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRouteLocale();
  const translate = await getStocksTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Stock watchlist"),
    description: translate("Search, save, and explore market trends across multiple timeframes."),
  });
}
