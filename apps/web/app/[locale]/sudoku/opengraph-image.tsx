import {
  createToolOpenGraphImage,
  openGraphImageContentType,
  openGraphImageSize,
} from "../../../lib/tool-open-graph-image";
import { getSudokuTranslator } from "../../../messages/sudoku/get-translator";
import { getRouteLocale } from "../../get-request-locale";

const descriptionKey =
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image." as const;

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Daily Sudoku";
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const locale = await getRouteLocale(params);
  const translate = await getSudokuTranslator(locale);

  return createToolOpenGraphImage({
    title: translate("Daily Sudoku"),
    description: translate(descriptionKey),
  });
}
