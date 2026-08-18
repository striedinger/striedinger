import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../lib/tool-open-graph-image";
import { getIpTranslator } from "../../messages/ip/get-translator";
import { getRequestLocale } from "../get-request-locale";

export const alt = "IP Address Information";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getIpTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("IP Address Information"),
    description: translate(
      "See the public IP address, approximate request location, and HTTP information visible to this website.",
    ),
  });
}
