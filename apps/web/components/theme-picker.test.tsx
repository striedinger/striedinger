import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ThemePicker } from "./theme-picker";
import { setTheme } from "./theme-store";

afterEach(function resetTheme() {
  setTheme("default");
  for (const link of document.querySelectorAll("link[data-theme-stylesheet]")) link.remove();
  delete document.documentElement.dataset.theme;
  document.cookie = "theme=; max-age=0; path=/";
});

describe("ThemePicker", function () {
  it("applies the selected tweakcn theme once its stylesheet loads and persists it", async function () {
    render(<ThemePicker label="Theme" />);

    fireEvent.click(screen.getByRole("combobox", { name: "Theme" }));
    const natureOption = screen.getByRole("option", { name: "Nature" });
    fireEvent.pointerDown(natureOption, { button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(natureOption, { button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.click(natureOption);

    const stylesheet = document.querySelector<HTMLLinkElement>(
      'link[data-theme-stylesheet="nature"]',
    );
    expect(stylesheet).toHaveAttribute("href", "/themes/nature.css");
    expect(document.documentElement.dataset.theme).not.toBe("nature");
    stylesheet?.dispatchEvent(new Event("load"));
    await waitFor(function expectNatureTheme() {
      expect(document.documentElement.dataset.theme).toBe("nature");
    });
    expect(document.cookie).toContain("theme=nature");
    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveTextContent("Nature");
  });

  it("does not reset a live selection when another picker mounts with stale server data", function () {
    const { rerender } = render(<ThemePicker label="Theme" />);
    setTheme("catppuccin");

    rerender(
      <>
        <ThemePicker label="Theme" />
        <ThemePicker label="Drawer theme" />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveTextContent("Catppuccin");
    expect(screen.getByRole("combobox", { name: "Drawer theme" })).toHaveTextContent("Catppuccin");
  });
});
