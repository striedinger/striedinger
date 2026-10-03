import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getIpTranslator } from "../../../messages/ip/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "IP Address Information";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getIpTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("IP Address Information"),
    description: translate(
      "See the public IP address, approximate request location, and HTTP information visible to this website.",
    ),
  });
}
