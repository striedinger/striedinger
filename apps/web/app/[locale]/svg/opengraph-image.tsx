import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getSvgTranslator } from "../../../messages/svg/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "SVG Editor";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getSvgTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("SVG Editor"),
    description: translate(
      "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.",
    ),
  });
}
