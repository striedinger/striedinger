import { optimize } from "svgo/browser";

export interface SvgOptimizationOptions {
  /** Keeps `width` and `height`, so the drawing keeps its intrinsic size. */
  keepDimensions: boolean;
}

export interface SvgWorkerRequest extends SvgOptimizationOptions {
  source: string;
}

export type SvgWorkerResponse = { data: string } | { error: string };

/** Multipass SVGO with three-decimal precision. */
export function optimizeSvgSource(source: string, { keepDimensions }: SvgOptimizationOptions) {
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
      ...(keepDimensions ? [] : ["removeDimensions" as const]),
    ],
  }).data;
}
