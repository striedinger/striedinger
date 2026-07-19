import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ThemePicker } from "./theme-picker";
import { setTheme } from "./theme-store";

afterEach(function resetTheme() {
  setTheme("default");
  delete document.documentElement.dataset.theme;
  document.cookie = "theme=; max-age=0; path=/";
});

describe("ThemePicker", function () {
  it("applies and persists the selected tweakcn theme", function () {
    render(<ThemePicker theme="default" label="Theme" />);

    fireEvent.click(screen.getByRole("combobox", { name: "Theme" }));
    const natureOption = screen.getByRole("option", { name: "Nature" });
    fireEvent.pointerDown(natureOption, { button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(natureOption, { button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.click(natureOption);

    expect(document.documentElement.dataset.theme).toBe("nature");
    expect(document.cookie).toContain("theme=nature");
    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveTextContent("Nature");
  });

  it("does not reset a live selection when another picker mounts with stale server data", function () {
    const { rerender } = render(<ThemePicker theme="default" label="Theme" />);
    setTheme("catppuccin");

    rerender(
      <>
        <ThemePicker theme="default" label="Theme" />
        <ThemePicker theme="default" label="Drawer theme" />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveTextContent("Catppuccin");
    expect(screen.getByRole("combobox", { name: "Drawer theme" })).toHaveTextContent("Catppuccin");
  });
});
