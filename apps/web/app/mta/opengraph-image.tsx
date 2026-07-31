import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getMtaTranslator } from "../../messages/mta/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "Trains near you - Live NYC subway arrivals";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getMtaTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Trains near you"),
    description: translate("Find nearby subway stops and see when your next train is arriving."),
  });
}
