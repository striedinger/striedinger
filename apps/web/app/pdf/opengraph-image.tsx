import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getPdfTranslator } from "../../messages/pdf/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "PDF Optimizer";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getPdfTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("PDF Optimizer"),
    description: translate(
      "Compress, preview, and remove PDF restrictions entirely in your browser.",
    ),
  });
}
