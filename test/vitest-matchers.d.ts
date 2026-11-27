import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

import "vitest";

declare module "vitest" {
  // oxlint-disable-next-line typescript/no-empty-object-type -- module augmentation needs an interface to merge into
  interface Matchers<R = unknown, T = unknown> extends TestingLibraryMatchers<R, T> {}
}
