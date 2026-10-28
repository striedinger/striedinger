import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IosAppSwitcherLabels } from "../../../components/ios/ios-app-switcher-context";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { ListeningAppSwitcherButton } from "./listening-app-switcher-button";

const labels = new Proxy({} as IosAppSwitcherLabels, {
  get(_target, key) {
    return key === "open" ? "Open apps menu" : String(key);
  },
});

function renderInApp() {
  render(
    <IosAppFrame appSwitcher={{ currentHref: "/listening", labels }}>
      <ListeningAppSwitcherButton />
    </IosAppFrame>,
  );
}

describe("ListeningAppSwitcherButton", function () {
  afterEach(function restoreWindow() {
    vi.restoreAllMocks();
  });

  it("offers the apps menu when the page is opened directly", function () {
    renderInApp();
    expect(screen.getByRole("button", { name: "Open apps menu" })).toBeInTheDocument();
  });

  it("leaves the menu out inside X's player card", function () {
    vi.spyOn(window, "top", "get").mockReturnValue({} as Window);
    renderInApp();
    expect(screen.queryByRole("button", { name: "Open apps menu" })).not.toBeInTheDocument();
  });
});
