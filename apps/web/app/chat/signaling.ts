import type { PairingBundle } from "./types";

const compressedPrefix = "nearby1c.";
const uncompressedPrefix = "nearby1u.";
const maximumDecodedPairingBundleLength = 32_000;
const maximumPairingCodeLength = 32_000;

export async function encodePairingBundle(bundle: PairingBundle): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));

  if ("CompressionStream" in globalThis) {
    const compressed = await transformBytes(bytes, new CompressionStream("deflate-raw"));
    return `${compressedPrefix}${encodeBase64Url(compressed)}`;
  }

  return `${uncompressedPrefix}${encodeBase64Url(bytes)}`;
}

export async function decodePairingBundle(code: string): Promise<PairingBundle> {
  const normalizedCode = code.trim();
  if (normalizedCode.length > maximumPairingCodeLength) throw new Error("Pairing code is too long");

  const compressed = normalizedCode.startsWith(compressedPrefix);
  const prefix = compressed ? compressedPrefix : uncompressedPrefix;
  if (!normalizedCode.startsWith(prefix)) throw new Error("Pairing code is invalid");

  let bytes = decodeBase64Url(normalizedCode.slice(prefix.length));
  if (compressed) {
    if (!("DecompressionStream" in globalThis)) throw new Error("Compressed codes are unsupported");
    bytes = await transformBytes(
      bytes,
      new DecompressionStream("deflate-raw"),
      maximumDecodedPairingBundleLength,
    );
  } else if (bytes.byteLength > maximumDecodedPairingBundleLength) {
    throw new Error("Pairing code expands beyond the allowed size");
  }

  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!isPairingBundle(parsed)) throw new Error("Pairing code is invalid");
  return parsed;
}

export function waitForIceGathering(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();

  return new Promise(function waitForCandidates(resolve) {
    const timeoutId = window.setTimeout(finish, 5_000);

    function finish() {
      window.clearTimeout(timeoutId);
      connection.removeEventListener("icegatheringstatechange", handleStateChange);
      resolve();
    }

    function handleStateChange() {
      if (connection.iceGatheringState === "complete") finish();
    }

    connection.addEventListener("icegatheringstatechange", handleStateChange);
  });
}

function isPairingBundle(value: unknown): value is PairingBundle {
  if (!value || typeof value !== "object") return false;
  const bundle = value as Partial<PairingBundle>;
  const description = bundle.description;
  return (
    bundle.version === 1 &&
    typeof bundle.key === "string" &&
    bundle.key.length >= 40 &&
    Boolean(description) &&
    (description?.type === "offer" || description?.type === "answer") &&
    typeof description.sdp === "string" &&
    description.sdp.length <= 24_000
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function transformBytes(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
  maximumOutputLength = Number.POSITIVE_INFINITY,
): Promise<Uint8Array<ArrayBuffer>> {
  const transformedStream = new Blob([bytes.slice().buffer]).stream().pipeThrough(transform);
  const reader = transformedStream.getReader();
  const chunks: Uint8Array[] = [];
  let outputLength = 0;

  try {
    while (true) {
      // oxlint-disable-next-line no-await-in-loop -- Stream chunks must be read in order.
      const result = await reader.read();
      if (result.done) break;
      outputLength += result.value.byteLength;
      if (outputLength > maximumOutputLength) {
        // oxlint-disable-next-line no-await-in-loop -- Cancellation must finish before releasing the reader.
        await reader.cancel();
        throw new Error("Pairing code expands beyond the allowed size");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(outputLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
