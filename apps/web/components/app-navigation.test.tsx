import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigation } from "./app-navigation";

const navigationState = vi.hoisted(function createNavigationState() {
  return { pathname: "/sudoku" };
});

vi.mock("next/navigation", function mockNextNavigation() {
  return {
    usePathname: function useMockPathname() {
      return navigationState.pathname;
    },
    useRouter: createMockRouter,
  };
});

function createMockRouter() {
  return { refresh: refreshMockRouter };
}

function refreshMockRouter() {}

const labels = {
  accentColor: "Accent color",
  close: "Close navigation",
  json: "JSON Validator and Formatter",
  menu: "Open navigation menu",
  navigation: "Navigation",
  og: "Open Graph Preview",
  selectLanguage: "Select language",
  subway: "Trains near you",
  sudoku: "Daily Sudoku",
};

describe("AppNavigation", function () {
  it("opens route navigation and identifies the current page", function () {
    navigationState.pathname = "/sudoku";
    render(<AppNavigation accentColor="blue" labels={labels} locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: labels.menu }));

    expect(screen.getByRole("dialog", { name: labels.navigation })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: labels.sudoku })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("combobox", { name: labels.selectLanguage })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: labels.accentColor })).toBeInTheDocument();
  });
});
