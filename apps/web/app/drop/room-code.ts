const roomCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const roomCodeCharacters = 16;
const roomCodePattern = /^[2-9A-HJ-NP-Z]{16}$/;

export function createRoomCode() {
  const randomValues = crypto.getRandomValues(new Uint8Array(roomCodeCharacters));
  let roomCode = "";

  for (const value of randomValues) {
    roomCode += roomCodeAlphabet[value % roomCodeAlphabet.length];
  }

  return roomCode;
}

export function formatRoomCode(roomCode: string) {
  return (
    normalizeRoomCode(roomCode)
      .match(/.{1,4}/g)
      ?.join("-") ?? ""
  );
}

export function normalizeRoomCode(roomCode: string) {
  return roomCode.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
}

export function parseRoomCode(roomCode: string) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  return roomCodePattern.test(normalizedRoomCode) ? normalizedRoomCode : undefined;
}

export async function deriveRoomId(roomCode: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(roomCode));
  return Array.from(new Uint8Array(digest), function encodeByte(byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}
