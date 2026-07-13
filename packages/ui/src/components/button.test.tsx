import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", function () {
  it("does not trigger device haptics as an implicit global side effect", function () {
    const vibrate = vi.fn<(duration: number) => void>();
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });

    render(<Button>Continue</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(vibrate).not.toHaveBeenCalled();
  });

  it("prevents interaction while loading and restores it afterward", function () {
    const handleClick = vi.fn<() => void>();
    const { rerender } = render(
      <Button loading loadingLabel="Saving" onClick={handleClick}>
        Save
      </Button>,
    );

    const loadingButton = screen.getByRole("button", { name: "Saving" });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(loadingButton);
    expect(handleClick).not.toHaveBeenCalled();

    rerender(<Button onClick={handleClick}>Save</Button>);

    const readyButton = screen.getByRole("button", { name: "Save" });
    expect(readyButton).toBeEnabled();
    fireEvent.click(readyButton);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("preserves its accessible name while loading without a replacement label", function () {
    render(<Button loading>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
