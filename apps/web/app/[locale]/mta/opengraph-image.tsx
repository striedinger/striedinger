import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getMtaTranslator } from "../../../messages/mta/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Trains near you - Live NYC subway arrivals";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getMtaTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Trains near you"),
    description: translate("Find nearby subway stops and see when your next train is arriving."),
  });
}
