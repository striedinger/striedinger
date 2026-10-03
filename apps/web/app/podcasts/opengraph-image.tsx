import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getPodcastTranslator } from "../../messages/podcasts/get-translator";
import { getRouteLocale } from "../get-request-locale";

export const alt = "Podcasts";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRouteLocale();
  const translate = await getPodcastTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Podcasts"),
    description: translate(
      "Discover shows, follow your favorites, and listen with a familiar player. Your library stays on this device.",
    ),
  });
}
