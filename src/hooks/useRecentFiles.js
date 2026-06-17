import { useState, useEffect, useCallback } from 'react';

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState([]);

  const refresh = useCallback(async () => {
    if (window.electronAPI) {
      const files = await window.electronAPI.getRecentFiles();
      setRecentFiles(files);
    } else {
      try {
        const saved = localStorage.getItem('txt-reader-recent');
        if (saved) setRecentFiles(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addRecent = useCallback(async (file) => {
    if (window.electronAPI) {
      await window.electronAPI.addRecentFile(file);
    } else {
      const files = recentFiles.filter((f) => f.path !== file.path);
      files.unshift({ ...file, lastOpened: new Date().toISOString() });
      const trimmed = files.slice(0, 50);
      setRecentFiles(trimmed);
      try { localStorage.setItem('txt-reader-recent', JSON.stringify(trimmed)); } catch {}
    }
    await refresh();
  }, [recentFiles, refresh]);

  const removeRecent = useCallback(async (filePath) => {
    if (window.electronAPI) {
      await window.electronAPI.removeRecentFile(filePath);
    } else {
      const files = recentFiles.filter((f) => f.path !== filePath);
      setRecentFiles(files);
      try { localStorage.setItem('txt-reader-recent', JSON.stringify(files)); } catch {}
    }
    await refresh();
  }, [recentFiles, refresh]);

  const clearRecent = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearRecentFiles();
    } else {
      setRecentFiles([]);
      try { localStorage.removeItem('txt-reader-recent'); } catch {}
    }
    await refresh();
  }, [refresh]);

  return { recentFiles, addRecent, removeRecent, clearRecent, refresh };
}
