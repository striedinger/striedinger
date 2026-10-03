import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getPdfTranslator } from "../../../messages/pdf/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "PDF Optimizer";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getPdfTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("PDF Optimizer"),
    description: translate(
      "Compress, preview, and remove PDF restrictions entirely in your browser.",
    ),
  });
}
