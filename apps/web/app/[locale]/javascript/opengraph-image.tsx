import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getJavaScriptTranslator } from "../../../messages/javascript/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "JavaScript Browser Information";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getJavaScriptTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("JavaScript Browser Information"),
    description: translate(
      "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.",
    ),
  });
}
