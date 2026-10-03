import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getDropTranslator } from "../../../messages/drop/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Drop - Private file sharing";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getDropTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Drop - Private file sharing"),
    description: translate(
      "Share files directly between devices with an encrypted peer-to-peer connection. Nothing is uploaded or stored on this server.",
    ),
  });
}
