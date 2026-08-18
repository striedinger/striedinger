import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getJavaScriptTranslator } from "../../messages/javascript/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "JavaScript Browser Information";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getJavaScriptTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("JavaScript Browser Information"),
    description: translate(
      "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.",
    ),
  });
}
