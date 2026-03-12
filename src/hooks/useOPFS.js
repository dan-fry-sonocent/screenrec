import { useState, useEffect, useCallback } from 'react';

export function useOPFS() {
  const [opfsRoot,    setOpfsRoot]    = useState(null);
  const [available,   setAvailable]   = useState(false);
  const [recordings,  setRecordings]  = useState([]);

  useEffect(() => {
    navigator.storage.getDirectory()
      .then(root => { setOpfsRoot(root); setAvailable(true); })
      .catch(() => setAvailable(false));
  }, []);

  const refresh = useCallback(async () => {
    if (!opfsRoot) return;
    const items = [];
    try {
      for await (const [name, handle] of opfsRoot.entries()) {
        if (handle.kind === 'file') {
          try {
            const file = await handle.getFile();
            items.push({ name, handle, file });
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
