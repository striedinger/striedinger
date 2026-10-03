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
  connectToStart: string;
  continue: string;
  copied: string;
  deviceCount: string;
  devicesConnected: string;
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
  oneDevice: string;
  oneDeviceConnected: string;
  pairingCode: string;
  pasteInvite: string;
  pasteReply: string;
  preparingConnection: string;
  readyToConnect: string;
  send: string;
  sendInvite: string;
  sendInviteInstruction: string;
  sendReply: string;
  sendReplyInstruction: string;
  shared: string;
  showCode: string;
  title: string;
  you: string;
  youAre: string;
}
