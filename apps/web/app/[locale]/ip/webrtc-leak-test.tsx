"use client";

import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { WebRtcLabels } from "./types";

interface IceCandidateResult {
  address: string;
  protocol: string;
  type: string;
}

interface WebRtcLeakTestProps {
  labels: WebRtcLabels;
}

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; candidates: ReadonlyArray<IceCandidateResult> }
  | { status: "error"; message: string };

export function WebRtcLeakTest({ labels }: WebRtcLeakTestProps) {
  const [state, setState] = useState<TestState>({ status: "idle" });

  async function runTest() {
    if (!("RTCPeerConnection" in window)) {
      setState({ status: "error", message: labels.notSupported });
      return;
    }

    setState({ status: "testing" });

    try {
      const candidates = await collectIceCandidates();
      setState({ status: "success", candidates });
    } catch {
      setState({ status: "error", message: labels.failed });
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="webrtc-test-heading">
      <div className="flex flex-col gap-2">
        <Text as="h2" id="webrtc-test-heading" size="xl" weight="semibold">
          {labels.heading}
        </Text>
        <Text size="sm" tone="muted">
          {labels.description}
        </Text>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={runTest}
          loading={state.status === "testing"}
          loadingLabel={labels.testing}
        >
          {labels.runTest}
        </Button>
      </div>

      {state.status === "success" ? (
        <Surface className="overflow-hidden shadow-none" aria-live="polite">
          {state.candidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-border/70 bg-muted/45">
                  <tr>
                    {[labels.candidateType, labels.address, labels.protocol].map(
                      function renderHeading(heading) {
                        return (
                          <Text
                            as="th"
                            key={heading}
                            scope="col"
                            family="mono"
                            size="xs"
                            tone="muted"
                            className="px-4 py-3"
                          >
                            {heading}
                          </Text>
                        );
                      },
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {state.candidates.map(function renderCandidate(candidate) {
                    return (
                      <tr key={`${candidate.type}-${candidate.address}-${candidate.protocol}`}>
                        <Text as="td" family="mono" size="xs" className="px-4 py-3">
                          {candidate.type}
                        </Text>
                        <Text as="td" family="mono" size="xs" className="px-4 py-3 break-all">
                          {candidate.address}
                        </Text>
                        <Text as="td" family="mono" size="xs" className="px-4 py-3">
                          {candidate.protocol}
                        </Text>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Text className="p-5" tone="muted">
              {labels.noCandidates}
            </Text>
          )}
        </Surface>
      ) : null}

      {state.status === "error" ? (
        <Surface className="p-5 shadow-none" aria-live="polite">
          <Text tone="muted">{state.message}</Text>
        </Surface>
      ) : null}
    </section>
  );
}

async function collectIceCandidates(): Promise<ReadonlyArray<IceCandidateResult>> {
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
  });
  const candidates = new Map<string, IceCandidateResult>();

  try {
    connection.createDataChannel("ip-diagnostic");

    const completed = new Promise<void>(function waitForCandidates(resolve) {
      const timeout = window.setTimeout(resolve, 5_000);

      connection.addEventListener("icecandidate", function handleCandidate(event) {
        if (!event.candidate) {
          window.clearTimeout(timeout);
          resolve();
          return;
        }

        const parsedCandidate = parseIceCandidate(event.candidate);
        if (parsedCandidate) {
          candidates.set(
            `${parsedCandidate.type}-${parsedCandidate.address}-${parsedCandidate.protocol}`,
            parsedCandidate,
          );
        }
      });
    });
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await completed;

    return Array.from(candidates.values());
  } finally {
    connection.close();
  }
}

function parseIceCandidate(candidate: RTCIceCandidate): IceCandidateResult | null {
  const parts = candidate.candidate.split(" ");
  const address = parts[4];
  const protocol = parts[2];
  const typeIndex = parts.indexOf("typ");
  const type = typeIndex >= 0 ? parts[typeIndex + 1] : undefined;

  if (!address || !protocol || !type) {
    return null;
  }

  return { address, protocol, type };
}
