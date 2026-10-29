import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Test files share one environment, so each starts from fresh app modules: a module another
// file already loaded would otherwise skip this file's `vi.mock` calls and keep its state.
vi.resetModules();

afterEach(cleanup);
