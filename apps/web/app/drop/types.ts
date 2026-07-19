export interface DropLabels {
  addFiles: string;
  availableFiles: string;
  copied: string;
  copyFailed: string;
  copyLink: string;
  description: string;
  directConnection: string;
  download: string;
  dropFiles: string;
  dropHint: string;
  encrypted: string;
  fileReady: string;
  fileInvalid: string;
  fileTooLarge: string;
  filesReady: string;
  join: string;
  joinCode: string;
  joinHint: string;
  invalidCode: string;
  noFiles: string;
  noPeers: string;
  onePeer: string;
  peers: string;
  preparing: string;
  privacy: string;
  roomCode: string;
  roomError: string;
  retry: string;
  selectFiles: string;
  sending: string;
  share: string;
  shareHint: string;
  title: string;
  transferFailed: string;
  waiting: string;
}

export interface SharedFile {
  file: File;
  id: string;
}

export type TransferDirection = "incoming" | "outgoing";
export type TransferStatus = "complete" | "error" | "sending" | "waiting";
export type TransferErrorReason = "file-too-large" | "invalid-payload" | "send-failed";

export interface TransferItem {
  direction: TransferDirection;
  errorReason?: TransferErrorReason;
  id: string;
  name: string;
  progress: number;
  size: number;
  status: TransferStatus;
  url?: string;
}

export interface TransferMetadata {
  id: string;
  lastModified: number;
  name: string;
  size: number;
  type: string;
}
