import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getPodcastTranslator } from "../../messages/podcasts/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "Podcasts";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getPodcastTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Podcasts"),
    description: translate(
      "Find a show, save it for later, and listen without creating an account.",
    ),
  });
}
