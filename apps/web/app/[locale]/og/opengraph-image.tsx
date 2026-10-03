import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getOgTranslator } from "../../../messages/og/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Open Graph Preview";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getOgTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Open Graph Preview"),
    description: translate(
      "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.",
    ),
  });
}
