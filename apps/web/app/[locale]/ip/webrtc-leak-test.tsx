"use client";

import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { WebRtcLabels } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";

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
    if (state.status === "testing") {
      return;
    }

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

  const isTesting = state.status === "testing";

  return (
    <div className="flex flex-col gap-6">
      <IosListSection
        className="px-0"
        header={labels.heading}
        footer={labels.description}
        label={labels.heading}
      >
        <li>
          <button
            type="button"
            aria-disabled={isTesting}
            aria-busy={isTesting}
            className="text-ios-body text-ios-tint focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed aria-disabled:text-ios-secondary-label flex min-h-[44px] w-full items-center px-4 text-left transition-colors duration-150 outline-none select-none motion-reduce:transition-none"
            onClick={runTest}
          >
            {isTesting ? labels.testing : labels.runTest}
          </button>
        </li>
      </IosListSection>

      <div aria-live="polite">
        {state.status === "success" ? (
          <IosListSection className="px-0" header={labels.candidates} label={labels.candidates}>
            {state.candidates.length === 0 ? (
              <li className="flex min-h-[44px] items-center gap-2.5 px-4 py-[11px]">
                <span aria-hidden="true" className="bg-ios-green size-2 shrink-0 rounded-full" />
                <Text className="text-ios-body text-ios-label">{labels.noCandidates}</Text>
              </li>
            ) : null}
            {state.candidates.map(function renderCandidate(candidate) {
              return (
                <li
                  key={`${candidate.type}-${candidate.address}-${candidate.protocol}`}
                  className="not-last:after:bg-ios-separator relative flex min-h-[44px] items-center justify-between gap-4 px-4 py-[11px] not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50"
                >
                  <Text
                    as="span"
                    family="mono"
                    className="text-ios-label min-w-0 text-[15px] leading-[22px] break-all"
                  >
                    <span className="sr-only">{labels.address} </span>
                    {candidate.address}
                  </Text>
                  <Text
                    as="span"
                    className="text-ios-subheadline text-ios-secondary-label shrink-0 text-right"
                  >
                    <span className="sr-only">{labels.candidateType} </span>
                    {candidate.type}
                    <span aria-hidden="true"> · </span>
                    <span className="sr-only">{labels.protocol} </span>
                    {candidate.protocol.toUpperCase()}
                  </Text>
                </li>
              );
            })}
          </IosListSection>
        ) : null}

        {state.status === "error" ? (
          <IosListSection className="px-0" label={labels.heading}>
            <li className="flex min-h-[44px] items-center gap-2.5 px-4 py-[11px]">
              <span aria-hidden="true" className="bg-ios-red size-2 shrink-0 rounded-full" />
              <Text className="text-ios-body text-ios-label">{state.message}</Text>
            </li>
          </IosListSection>
        ) : null}
      </div>
    </div>
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
