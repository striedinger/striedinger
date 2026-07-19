import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PairingPanelProps } from "./pairing-panel";

import { PairingPanel } from "./pairing-panel";

function createProps(overrides: Partial<PairingPanelProps> = {}): PairingPanelProps {
  return {
    connectionError: "",
    onAcceptAnswer: vi.fn<(code: string) => Promise<void>>(async function acceptAnswer() {}),
    onAcceptInvite: vi.fn<(code: string) => Promise<void>>(async function acceptInvite() {}),
    onCancel: vi.fn<() => void>(),
    onCreateInvite: vi.fn<() => Promise<void>>(async function createInvite() {}),
    pairingCode: "",
    pairingState: "idle",
    peerCount: 0,
    ...overrides,
  };
}

describe("pairing panel", function () {
  it("resets the join wizard after a pairing completes", async function () {
    const props = createProps();
    const view = render(<PairingPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Join with an invite" }));
    expect(screen.getByRole("textbox", { name: "Paste the invite you received" })).toBeVisible();

    view.rerender(<PairingPanel {...props} pairingState="creating" />);
    view.rerender(<PairingPanel {...props} pairingState="idle" peerCount={1} />);

    await waitFor(function expectConnectionChoices() {
      expect(screen.getByRole("button", { name: "Invite someone" })).toBeVisible();
      expect(screen.queryByRole("textbox", { name: "Paste the invite you received" })).toBeNull();
    });
  });

  it("submits a received invite", function () {
    const onAcceptInvite = vi.fn<(code: string) => Promise<void>>(async function acceptInvite() {});
    render(<PairingPanel {...createProps({ onAcceptInvite })} />);
    fireEvent.click(screen.getByRole("button", { name: "Join with an invite" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Paste the invite you received" }), {
      target: { value: "nearby1c.invite" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onAcceptInvite).toHaveBeenCalledWith("nearby1c.invite");
  });
});
