import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getNotesTranslator } from "../../../messages/notes/get-translator";
import { getRouteLocale } from "../../get-request-locale";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Notes";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getNotesTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Notes"),
    description: translate(
      "Capture ideas with rich text, checklists, and photos. Your notes stay on this device.",
    ),
  });
}
