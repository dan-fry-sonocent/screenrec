import { useState, useEffect, useCallback } from 'react';
import { RecordingEntry } from '../types';

export function useOPFS(): {
  opfsRoot: FileSystemDirectoryHandle | null;
  available: boolean;
  recordings: RecordingEntry[];
  refresh: () => Promise<void>;
} {
  const [opfsRoot,    setOpfsRoot]    = useState<FileSystemDirectoryHandle | null>(null);
  const [available,   setAvailable]   = useState(false);
  const [recordings,  setRecordings]  = useState<RecordingEntry[]>([]);

  useEffect(() => {
    navigator.storage.getDirectory()
      .then(root => { setOpfsRoot(root); setAvailable(true); })
      .catch(() => setAvailable(false));
  }, []);

  const refresh = useCallback(async () => {
    if (!opfsRoot) return;
    const items: RecordingEntry[] = [];
    try {
      for await (const [name, handle] of opfsRoot.entries()) {
        if (handle.kind === 'file') {
          try {
            const fileHandle = handle as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            items.push({ name, handle: fileHandle, file });
          } catch {}
        }
      }
    } catch (e) {
      console.warn('OPFS listing:', e);
      return;
    }
    items.sort((a, b) => b.file.lastModified - a.file.lastModified);
    setRecordings(items);
  }, [opfsRoot]);

  // Load recordings once the root is available.
  useEffect(() => { refresh(); }, [refresh]);

  return { opfsRoot, available, recordings, refresh };
}
