import type { PageMetadata } from "./types";

import { validatePublicUrl } from "./validate-public-url";

export async function sanitizePageMetadata(metadata: PageMetadata): Promise<PageMetadata> {
  const [image, distinctTwitterImage] = await Promise.all([
    sanitizeImageUrl(metadata.image),
    metadata.twitterImage === metadata.image
      ? Promise.resolve("")
      : sanitizeImageUrl(metadata.twitterImage),
  ]);
  const twitterImage = metadata.twitterImage === metadata.image ? image : distinctTwitterImage;

  return {
    ...metadata,
    image,
    twitterImage,
  };
}

async function sanitizeImageUrl(value: string): Promise<string> {
  if (!value) {
    return "";
  }

  try {
    const validatedImage = await validatePublicUrl(value);
    return validatedImage.url.toString();
  } catch {
    return "";
  }
}
