// Tiny IndexedDB store to persist granted FileSystemDirectoryHandles so a
// returning visitor doesn't have to re-pick their folder. Handles are
// structured-cloneable; permission is re-verified on use.

const DB = "agentmon";
const STORE = "handles";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export async function saveHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(handle, key));
  } catch {
    /* private-mode / unsupported — non-fatal */
  }
}

export async function loadHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await tx<FileSystemDirectoryHandle | undefined>("readonly", (s) => s.get(key))) ?? null;
  } catch {
    return null;
  }
}

/** Persist a set of granted handles (for connecting multiple folders). */
export async function saveHandles(key: string, handles: FileSystemDirectoryHandle[]): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(handles, key));
  } catch {
    /* private-mode / unsupported — non-fatal */
  }
}

/** Load persisted handles. Tolerates a legacy single-handle value written by an
 *  earlier build (wraps it in an array). */
export async function loadHandles(key: string): Promise<FileSystemDirectoryHandle[]> {
  try {
    const v = await tx<unknown>("readonly", (s) => s.get(key));
    if (Array.isArray(v)) return v as FileSystemDirectoryHandle[];
    if (v) return [v as FileSystemDirectoryHandle];
    return [];
  } catch {
    return [];
  }
}

export async function clearHandles(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    /* ignore */
  }
}

/** Re-verify (and if needed re-request) read permission on a stored handle. */
export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // @ts-expect-error — queryPermission is not yet in the TS DOM lib
  const q = (await handle.queryPermission?.({ mode: "read" })) as PermissionState | undefined;
  if (q === "granted") return true;
  // @ts-expect-error — requestPermission likewise
  const r = (await handle.requestPermission?.({ mode: "read" })) as PermissionState | undefined;
  return r === "granted";
}
