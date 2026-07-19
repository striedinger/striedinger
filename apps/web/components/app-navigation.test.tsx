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
  chat: "Nearby Chat",
  close: "Close navigation",
  drop: "Drop - Private file sharing",
  json: "JSON Validator and Formatter",
  image: "Image Optimizer",
  menu: "Open navigation menu",
  navigation: "Navigation",
  og: "Open Graph Preview",
  podcasts: "Podcasts",
  pdf: "PDF Optimizer",
  selectLanguage: "Select language",
  stocks: "Stock watchlist",
  subway: "Trains near you",
  sudoku: "Daily Sudoku",
  theme: "Theme",
};

describe("AppNavigation", function () {
  it("opens route navigation and identifies the current page", function () {
    navigationState.pathname = "/sudoku";
    render(<AppNavigation labels={labels} locale="en" theme="default" />);

    fireEvent.click(screen.getByRole("button", { name: labels.menu }));

    expect(screen.getByRole("dialog", { name: labels.navigation })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: labels.sudoku })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("combobox", { name: labels.selectLanguage })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: labels.theme })).toBeInTheDocument();
  });
});
