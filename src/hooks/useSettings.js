import { useState, useEffect, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  fontSize: 18,
  fontFamily: '"Songti SC", "STSong", "Noto Serif CJK SC", "PingFang SC", serif',
  lineHeight: 1.8,
  readingWidth: 800,
  theme: 'light',
  encoding: null,
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        setSettings({ ...DEFAULT_SETTINGS, ...s });
        setLoaded(true);
      });
    } else {
      // Browser fallback
      try {
        const saved = localStorage.getItem('txt-reader-settings');
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {}
      setLoaded(true);
    }
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);

    if (window.electronAPI) {
      await window.electronAPI.setSettings(patch);
    } else {
      try {
        localStorage.setItem('txt-reader-settings', JSON.stringify(next));
      } catch {}
    }
  }, [settings]);

  return { settings, updateSettings, loaded };
}
