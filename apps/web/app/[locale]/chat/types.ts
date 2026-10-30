/** A message as it travels between devices, encrypted separately for each connection. */
export interface ChatMessage {
  author: string;
  id: string;
  /** The sending device is forwarding a message that another device wrote. */
  relayed?: true;
  sentAt: number;
  text: string;
}

export interface VisibleChatMessage {
  /** For direct messages, the name the connection was paired under; otherwise only a claim. */
  author: string;
  id: string;
  isOwn: boolean;
  /** The paired device that forwarded the message, the only sender that can be verified. */
  relayedBy?: string;
  /** Keeps bubbles from different connections apart even when their names match. */
  senderId: string;
  sentAt: number;
  text: string;
}

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  type: "encrypted";
}

export interface PairingBundle {
  /** The name the sending device chose, which the other side binds to this connection. */
  alias?: string;
  description: RTCSessionDescriptionInit;
  /** Only the invite carries the key; replies omit it because the inviter already has it. */
  key?: string;
  version: 1;
}

export interface PeerIdentity {
  /** The name shown for everything this connection sends, fixed when it opens. */
  alias: string;
  id: string;
}

export interface PeerSession extends PeerIdentity {
  channel: RTCDataChannel;
  connection: RTCPeerConnection;
  key: CryptoKey;
}

export type PairingState = "idle" | "creating" | "share" | "answer" | "connecting";

export interface ChatLabels {
  anonymousAlias: string;
  back: string;
  cancelPairing: string;
  closeDevices: string;
  connect: string;
  connecting: string;
  connectionFailed: string;
  connectToChat: string;
  connectToJoin: string;
  continue: string;
  copied: string;
  devicesConnected: string;
  downloadingTranslation: string;
  invalidAnswer: string;
  invalidInvite: string;
  inviteFailed: string;
  inviteSomeone: string;
  joinWithInvite: string;
  keepPageOpen: string;
  localOnly: string;
  message: string;
  messageNearby: string;
  messages: string;
  nearbyDevices: string;
  noMessages: string;
  oneDeviceConnected: string;
  pairingCode: string;
  pasteInvite: string;
  pasteReply: string;
  preparingConnection: string;
  privacyIntro: string;
  readyToConnect: string;
  relayedVia: string;
  send: string;
  sendInvite: string;
  sendInviteInstruction: string;
  sendReply: string;
  sendReplyInstruction: string;
  shared: string;
  showCode: string;
  title: string;
  translatedFrom: string;
  translateFrom: string;
  translating: string;
  you: string;
  youAre: string;
}
