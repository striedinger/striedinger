import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getPodcastTranslator } from "../../../messages/podcasts/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Podcasts";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getPodcastTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Podcasts"),
    description: translate(
      "Discover shows, follow your favorites, and listen with a familiar player. Your library stays on this device.",
    ),
  });
}
