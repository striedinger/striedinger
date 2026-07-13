import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AccentColorPicker } from "./accent-color-picker";
import { setAccentColor } from "./accent-color-store";

afterEach(function resetAccentColor() {
  setAccentColor("blue");
  document.documentElement.style.removeProperty("--accent-hue");
  document.documentElement.style.removeProperty("--accent-chroma");
  delete document.documentElement.dataset.accent;
  document.cookie = "accent-color=; max-age=0; path=/";
});

describe("AccentColorPicker", function () {
  it("applies and persists the selected theme accent", function () {
    render(<AccentColorPicker accentColor="blue" label="Accent color" />);

    fireEvent.click(screen.getByRole("button", { name: "Accent color 6" }));

    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("152");
    expect(document.documentElement.style.getPropertyValue("--accent-chroma")).toBe("0.14");
    expect(document.cookie).toContain("accent-color=green");
    expect(screen.getByRole("button", { name: "Accent color 6" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("activates the monochrome theme", function () {
    render(<AccentColorPicker accentColor="blue" label="Accent color" />);

    fireEvent.click(screen.getByRole("button", { name: "Accent color 1" }));

    expect(document.documentElement.dataset.accent).toBe("neutral");
    expect(document.cookie).toContain("accent-color=neutral");
  });

  it("does not reset the live accent when another picker mounts with stale server data", function () {
    const { rerender } = render(<AccentColorPicker accentColor="blue" label="Accent color" />);
    fireEvent.click(screen.getByRole("button", { name: "Accent color 6" }));

    rerender(
      <>
        <AccentColorPicker accentColor="blue" label="Accent color" />
        <AccentColorPicker accentColor="blue" label="Drawer accent color" />
      </>,
    );

    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("152");
    expect(screen.getByRole("button", { name: "Drawer accent color 6" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
