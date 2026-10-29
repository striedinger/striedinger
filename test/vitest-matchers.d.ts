import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

import "vitest";

// jest-dom 7 still augments Vitest's pre-v5 Assertion type. Use the v5 extension point.
declare module "vitest" {
  // oxlint-disable-next-line typescript/no-empty-object-type -- module augmentation needs an interface to merge into
  interface Matchers<R = unknown, T = unknown> extends TestingLibraryMatchers<R, T> {}
}
