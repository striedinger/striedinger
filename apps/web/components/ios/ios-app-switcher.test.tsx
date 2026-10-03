import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IosAppFrame } from "./ios-app-frame";
import { IosAppSwitcherButton } from "./ios-app-switcher-button";

const labels = {
  apps: "Apps",
  chat: "Nearby Chat",
  close: "Close navigation",
  home: "Home",
  image: "Image Optimizer",
  ip: "IP Address Information",
  javascript: "JavaScript Browser Information",
  json: "JSON Validator and Formatter",
  navigation: "Navigation",
  notes: "Notes",
  og: "Open Graph Preview",
  open: "Open apps menu",
  pdf: "PDF Optimizer",
  podcasts: "Podcasts",
  stocks: "Stocks",
  sudoku: "Sudoku",
  tools: "Tools",
  trains: "Trains",
};

describe("IosAppSwitcher", function () {
  it("opens a sheet linking to every app and tool, marking the current app", async function () {
    render(
      <IosAppFrame appSwitcher={{ currentHref: "/mta", labels }}>
        <IosAppSwitcherButton />
      </IosAppFrame>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open apps menu" }));

    const navigation = await screen.findByRole("navigation", { name: "Navigation" });
    expect(navigation).toBeVisible();
    expect(screen.getByRole("link", { name: "Trains" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Notes" })).toHaveAttribute("href", "/notes");
    expect(screen.getByRole("link", { name: "Drop" })).toHaveAttribute("href", "/drop");
    expect(screen.getByRole("link", { name: "PDF Optimizer" })).toHaveAttribute("href", "/pdf");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    await waitFor(function expectSheetClosed() {
      expect(screen.queryByRole("navigation", { name: "Navigation" })).not.toBeInTheDocument();
    });
  });

  it("renders no button outside an app that offers the switcher", function () {
    render(<IosAppSwitcherButton />);
    expect(screen.queryByRole("button", { name: "Open apps menu" })).not.toBeInTheDocument();
  });
});
