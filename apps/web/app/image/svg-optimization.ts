import { optimize } from "svgo/browser";

import type { CompressionMode } from "./types";

export interface SvgWorkerRequest {
  compressionMode: CompressionMode;
  source: string;
}

export type SvgWorkerResponse = { data: string } | { error: string };

/** Multipass SVGO with the optimizer's precision settings. */
export function optimizeSvgSource(source: string, compressionMode: CompressionMode): string {
  return optimize(source, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupNumericValues: { floatPrecision: 3 },
            convertPathData: { floatPrecision: 3 },
          },
        },
      },
      ...(compressionMode === "lossless" ? [] : ["removeDimensions" as const]),
    ],
  }).data;
}
