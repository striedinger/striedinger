import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Image } from "./image";

describe("Image", function () {
  it("leaves its loading state when the image loads", function () {
    const handleLoad = vi.fn<() => void>();
    const { container } = render(<Image src="/portrait.jpg" alt="Portrait" onLoad={handleLoad} />);
    const image = screen.getByRole("img", { name: "Portrait" });
    const imageContainer = container.firstElementChild;

    expect(imageContainer).toHaveAttribute("aria-busy", "true");
    fireEvent.load(image);
    expect(imageContainer).toHaveAttribute("aria-busy", "false");
    expect(handleLoad).toHaveBeenCalledOnce();
  });

  it("shows an accessible failure state when loading fails", function () {
    const handleError = vi.fn<() => void>();
    render(<Image src="/missing.jpg" alt="Team photo" onError={handleError} />);

    fireEvent.error(screen.getByRole("img", { name: "Team photo" }));

    expect(screen.getByRole("img", { name: "Team photo" })).toBeInTheDocument();
    expect(handleError).toHaveBeenCalledOnce();
  });

  it("resets to loading when the source changes", function () {
    const { container, rerender } = render(<Image src="/first.jpg" alt="Preview" />);
    fireEvent.load(screen.getByRole("img", { name: "Preview" }));
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "false");

    rerender(<Image src="/second.jpg" alt="Preview" />);

    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });
});
