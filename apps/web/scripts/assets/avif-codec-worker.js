import createAvifEncoder from "./avif_enc.js";
import { defaultOptions } from "./meta.js";
import { initEmscriptenModule } from "./utils.js";

let encoderPromise;

self.addEventListener("message", function receiveMessage(event) {
  void encodeMessage(event.data);
});

/** Encodes one image and replies with the AVIF bytes or the error, never rejecting. */
async function encodeMessage(message) {
  const { data, height, id, options, width } = message;
  try {
    const normalizedOptions = { ...defaultOptions, ...options };
    if (normalizedOptions.bitDepth !== 8) throw new Error("Only 8-bit AVIF input is supported.");
    if (normalizedOptions.lossless === true) {
      normalizedOptions.quality = 100;
      normalizedOptions.qualityAlpha = -1;
      normalizedOptions.subsample = 3;
    }

    encoderPromise ??= initEmscriptenModule(createAvifEncoder);
    const encoder = await encoderPromise;
    const output = encoder.encode(new Uint8Array(data), width, height, normalizedOptions);
    if (output === null || output === undefined) throw new Error("AVIF encoding failed.");
    const buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
    self.postMessage({ buffer, id }, [buffer]);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "AVIF encoding failed.",
      id,
    });
  }
}
