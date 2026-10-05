import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getVideoTranslator } from "../../../messages/video/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Video Editor";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getVideoTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Video Editor"),
    description: translate(
      "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.",
    ),
  });
}
