import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguagePicker } from "./language-picker";

vi.mock("next/navigation", function mockNavigation() {
  return { useRouter: () => ({ push: vi.fn<(href: string) => void>() }) };
});

describe("LanguagePicker", function () {
  it("loads the language list on first press and opens it", async function () {
    render(<LanguagePicker label="Select language" locale="es" />);

    const trigger = screen.getByRole("button", { name: "Select language" });
    expect(trigger).toHaveTextContent("Español");

    fireEvent.click(trigger);

    expect(await screen.findByRole("option", { name: "Deutsch" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
  });
});
