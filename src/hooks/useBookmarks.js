import { useState, useEffect, useCallback } from 'react';

export function useBookmarks(filePath) {
  const [bookmarks, setBookmarks] = useState([]);

  const refresh = useCallback(async () => {
    if (!filePath) {
      setBookmarks([]);
      return;
    }
    if (window.electronAPI) {
      const bm = await window.electronAPI.getBookmarks(filePath);
      setBookmarks(bm || []);
    } else {
      try {
        const key = `txt-reader-bookmarks-${filePath}`;
        const saved = localStorage.getItem(key);
        if (saved) setBookmarks(JSON.parse(saved));
        else setBookmarks([]);
      } catch {}
    }
  }, [filePath]);

  useEffect(() => { refresh(); }, [refresh]);

  const addBookmark = useCallback(async (bookmark) => {
    if (!filePath) return;
    if (window.electronAPI) {
      await window.electronAPI.addBookmark(filePath, bookmark);
    } else {
      const updated = [...bookmarks, bookmark];
      setBookmarks(updated);
      try {
        localStorage.setItem(`txt-reader-bookmarks-${filePath}`, JSON.stringify(updated));
      } catch {}
    }
    await refresh();
  }, [filePath, bookmarks, refresh]);

  const removeBookmark = useCallback(async (bookmarkId) => {
    if (!filePath) return;
    if (window.electronAPI) {
      await window.electronAPI.removeBookmark(filePath, bookmarkId);
    } else {
      const updated = bookmarks.filter((b) => b.id !== bookmarkId);
      setBookmarks(updated);
      try {
        localStorage.setItem(`txt-reader-bookmarks-${filePath}`, JSON.stringify(updated));
      } catch {}
    }
    await refresh();
  }, [filePath, bookmarks, refresh]);

  return { bookmarks, addBookmark, removeBookmark, refresh };
}
