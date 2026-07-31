import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getTranslator } from "../../messages/get-translator";
import { getRequestLocale } from "../get-request-locale";

const descriptionKey =
  "Chat privately with nearby devices over a fast, encrypted, serverless peer-to-peer mesh.";

export const alt = "Nearby Chat - Private local messaging";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Nearby Chat - Private local messaging"),
    description: translate(descriptionKey),
  });
}
