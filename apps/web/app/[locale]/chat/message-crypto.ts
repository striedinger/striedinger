import type { ChatMessage, EncryptedEnvelope } from "./types";

export async function createMessageKey(): Promise<{ exported: string; key: CryptoKey }> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return { exported: encodeBase64Url(rawKey), key };
}

export async function importMessageKey(exported: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", decodeBase64Url(exported), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptMessage(key: CryptoKey, message: ChatMessage): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(message));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const envelope: EncryptedEnvelope = {
    ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
    iv: encodeBase64Url(iv),
    type: "encrypted",
  };
  return JSON.stringify(envelope);
}

export async function decryptMessage(key: CryptoKey, payload: string): Promise<ChatMessage> {
  const parsed: unknown = JSON.parse(payload);
  if (!isEncryptedEnvelope(parsed)) throw new Error("Invalid encrypted message");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(parsed.iv) },
    key,
    decodeBase64Url(parsed.ciphertext),
  );
  const message: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (!isChatMessage(message)) throw new Error("Invalid chat message");
  return {
    author: message.author,
    id: message.id,
    sentAt: message.sentAt,
    text: message.text,
  };
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<EncryptedEnvelope>;
  return (
    envelope.type === "encrypted" &&
    typeof envelope.ciphertext === "string" &&
    typeof envelope.iv === "string"
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    typeof message.author === "string" &&
    message.author.length <= 40 &&
    typeof message.id === "string" &&
    message.id.length <= 80 &&
    typeof message.sentAt === "number" &&
    Number.isSafeInteger(message.sentAt) &&
    message.sentAt >= 0 &&
    message.sentAt <= 8_640_000_000_000_000 &&
    typeof message.text === "string" &&
    message.text.length <= 2_000
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
