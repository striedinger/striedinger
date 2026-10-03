import type { Note, NoteFolder } from "./types";

const databaseName = "ios-notes";
const databaseVersion = 1;
const noteStoreName = "notes";
const folderStoreName = "folders";

export interface StoredNotes {
  folders: NoteFolder[];
  notes: Note[];
}

let databasePromise: Promise<IDBDatabase | null> | null = null;

// IndexedDB keeps notes and their images on this device. When it is unavailable (private
// browsing, blocked storage, or tests) the app keeps working with in-memory state.
function openDatabase(): Promise<IDBDatabase | null> {
  databasePromise ??= new Promise(function connect(resolve) {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.addEventListener("upgradeneeded", function createStores() {
        const database = request.result;
        if (!database.objectStoreNames.contains(noteStoreName)) {
          database.createObjectStore(noteStoreName, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(folderStoreName)) {
          database.createObjectStore(folderStoreName, { keyPath: "id" });
        }
      });
      request.addEventListener("success", function useDatabase() {
        resolve(request.result);
      });
      request.addEventListener("error", function useMemoryOnly() {
        resolve(null);
      });
      request.addEventListener("blocked", function useMemoryOnly() {
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
  return databasePromise;
}

function requestToPromise<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise(function waitForRequest(resolve, reject) {
    request.addEventListener("success", function resolveRequest() {
      resolve(request.result);
    });
    request.addEventListener("error", function rejectRequest() {
      reject(request.error ?? new Error("IndexedDB request failed"));
    });
  });
}

export async function readStoredNotes(): Promise<StoredNotes> {
  const database = await openDatabase();
  if (!database) return { folders: [], notes: [] };
  try {
    const transaction = database.transaction([noteStoreName, folderStoreName], "readonly");
    const [notes, folders] = await Promise.all([
      requestToPromise(transaction.objectStore(noteStoreName).getAll() as IDBRequest<unknown[]>),
      requestToPromise(transaction.objectStore(folderStoreName).getAll() as IDBRequest<unknown[]>),
    ]);
    return { folders: folders.filter(isNoteFolder), notes: notes.filter(isNote) };
  } catch {
    return { folders: [], notes: [] };
  }
}

async function writeRecords(
  storeName: string,
  records: readonly object[],
  deletedIds: readonly string[],
) {
  const database = await openDatabase();
  if (!database) return;
  try {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    for (const record of records) store.put(record);
    for (const id of deletedIds) store.delete(id);
    await new Promise<void>(function waitForTransaction(resolve) {
      transaction.addEventListener("complete", function completeTransaction() {
        resolve();
      });
      transaction.addEventListener("error", function ignoreFailedWrite() {
        resolve();
      });
      transaction.addEventListener("abort", function ignoreAbortedWrite() {
        resolve();
      });
    });
  } catch {
    // Quota and storage failures leave the in-memory notes usable.
  }
}

export function saveNotes(notes: readonly Note[]) {
  return writeRecords(noteStoreName, notes, []);
}

export function deleteNotes(noteIds: readonly string[]) {
  return writeRecords(noteStoreName, [], noteIds);
}

export function saveFolders(folders: readonly NoteFolder[]) {
  return writeRecords(folderStoreName, folders, []);
}

export function deleteFolders(folderIds: readonly string[]) {
  return writeRecords(folderStoreName, [], folderIds);
}

function isNoteFolder(value: unknown): value is NoteFolder {
  if (!value || typeof value !== "object") return false;
  const folder = value as Partial<NoteFolder>;
  return (
    typeof folder.id === "string" &&
    typeof folder.name === "string" &&
    typeof folder.createdAt === "number"
  );
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<Note>;
  return (
    typeof note.id === "string" &&
    typeof note.folderId === "string" &&
    typeof note.html === "string" &&
    typeof note.title === "string" &&
    typeof note.preview === "string" &&
    (note.thumbnail === null || typeof note.thumbnail === "string") &&
    typeof note.pinned === "boolean" &&
    typeof note.createdAt === "number" &&
    typeof note.updatedAt === "number" &&
    (note.deletedAt === null || typeof note.deletedAt === "number")
  );
}
