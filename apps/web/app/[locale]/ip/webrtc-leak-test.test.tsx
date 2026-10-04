import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WebRtcLabels } from "./types";

import { WebRtcLeakTest } from "./webrtc-leak-test";

const labels: WebRtcLabels = {
  address: "Address",
  candidates: "ICE Candidates",
  candidateType: "Candidate type",
  description: "Lists the ICE addresses exposed by your browser.",
  failed: "The WebRTC test could not complete.",
  heading: "WebRTC Leak Test",
  noCandidates: "No ICE candidates were exposed.",
  notSupported: "WebRTC is not supported by this browser.",
  protocol: "Protocol",
  runTest: "Run WebRTC test",
  testing: "Testing…",
};

class FakePeerConnection extends EventTarget {
  close() {}

  createDataChannel() {}

  createOffer() {
    return Promise.resolve({ sdp: "", type: "offer" });
  }

  setLocalDescription() {
    const candidate = {
      candidate: "candidate:1 1 udp 2122260223 203.0.113.7 54321 typ srflx",
    };
    for (const nextCandidate of [candidate, null]) {
      this.dispatchEvent(Object.assign(new Event("icecandidate"), { candidate: nextCandidate }));
    }
    return Promise.resolve();
  }
}

afterEach(function cleanUp() {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WebRtcLeakTest", function describeWebRtcLeakTest() {
  it("explains when the browser has no WebRTC support", async function testUnsupported() {
    render(<WebRtcLeakTest labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: labels.runTest }));

    expect(await screen.findByText(labels.notSupported)).toBeInTheDocument();
  });

  it("lists the ICE candidates the browser exposes", async function testCandidates() {
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    render(<WebRtcLeakTest labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: labels.runTest }));

    expect(await screen.findByText("203.0.113.7")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: labels.candidates })).toHaveTextContent("UDP");
    expect(screen.getByRole("button", { name: labels.runTest })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
