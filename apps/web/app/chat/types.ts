export type PairingRole = "initiator" | "responder";

export interface ChatMessage {
  author: string;
  id: string;
  sentAt: number;
  text: string;
}

export interface VisibleChatMessage extends ChatMessage {
  isOwn: boolean;
}

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  type: "encrypted";
}

export interface PairingBundle {
  description: RTCSessionDescriptionInit;
  key: string;
  version: 1;
}

export interface PeerSession {
  channel: RTCDataChannel;
  connection: RTCPeerConnection;
  id: string;
  key: CryptoKey;
}

export type PairingState = "idle" | "creating" | "share" | "answer" | "connecting";
