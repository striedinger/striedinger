import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getImageTranslator } from "../../messages/image/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "Image Optimizer";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getImageTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Image Optimizer"),
    description: translate("Compress images privately in your browser. Nothing is uploaded."),
  });
}
