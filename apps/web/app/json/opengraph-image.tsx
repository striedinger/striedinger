import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getJsonTranslator } from "../../messages/json/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "JSON Validator and Formatter";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getJsonTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("JSON Validator and Formatter"),
    description: translate(
      "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.",
    ),
  });
}
