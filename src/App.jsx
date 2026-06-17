import React, { useState, useCallback, useEffect, useRef } from 'react';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import Reader from './components/Reader';
import SearchBar from './components/SearchBar';
import SettingsPanel from './components/SettingsPanel';
import { useSettings } from './hooks/useSettings';
import { useRecentFiles } from './hooks/useRecentFiles';
import { useBookmarks } from './hooks/useBookmarks';
import { useChapterDetection } from './hooks/useChapterDetection';
import { setupShortcuts } from './utils/shortcuts';
import { createTTS } from './utils/tts';
import { formatFileSize } from './utils/encoding';

export default function App() {
  const { settings, updateSettings, loaded } = useSettings();
  const { recentFiles, addRecent, removeRecent, clearRecent, refresh: refreshRecent } = useRecentFiles();

  // File state
  const [filePath, setFilePath] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileContent, setFileContent] = useState('');
  const [fileEncoding, setFileEncoding] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);

  // UI state
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('chapters');
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(0);

  // TTS state
  const [ttsState, setTtsState] = useState({ speaking: false, paused: false, available: false });
  const ttsRef = useRef(null);
  const readerRef = useRef(null);
  const pendingScrollRef = useRef(null);

  // Derived data
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks(filePath);
  const chapters = useChapterDetection(fileContent);

  // Initialize TTS
  useEffect(() => {
    ttsRef.current = createTTS();
    ttsRef.current.setOnStateChange(setTtsState);
    setTtsState(ttsRef.current.getState());
  }, []);

  // Load file
  const loadFile = useCallback(async (path, encoding) => {
    if (!path) return;
    setFileLoading(true);
    try {
      const api = window.electronAPI;
      const info = api ? await api.getFileInfo(path) : { name: path.split('/').pop(), path, size: 0 };

      // Resolve saved reading position BEFORE any file-content state update,
      // so pendingScrollRef is ready when the scroll-restore effect fires.
      let savedPos = 0;
      if (api) {
        savedPos = await api.getPosition(info.path);
      }
      pendingScrollRef.current = savedPos > 0 ? savedPos : null;

      // Only pass encoding when user explicitly chose one (via handleEncodingChange).
      // Otherwise let the main process auto-detect.
      const result = api
        ? await api.readFile(path, encoding || undefined)
        : await readFileBrowser(path, encoding || 'utf-8');

      setFilePath(info.path);
      setFileName(info.name);
      setFileSize(info.size);
      setFileContent(result.text);
      setFileEncoding(result.encoding);

      // Save to recent
      addRecent({ path: info.path, name: info.name, encoding: result.encoding });
    } catch (e) {
      console.error('Failed to load file:', e);
    } finally {
      setFileLoading(false);
    }
  }, [addRecent]);

  // Browser fallback for file reading (dev without Electron)
  async function readFileBrowser(path, encoding) {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder(encoding || 'utf-8');
    return { text: decoder.decode(buffer), encoding: encoding || 'utf-8' };
  }

  // Open file via dialog
  const handleOpenFile = useCallback(async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFile();
      if (path) loadFile(path);
    } else {
      // Browser fallback: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.text,.log,.md';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setFilePath(file.name);
            setFileName(file.name);
            setFileSize(file.size);
            setFileContent(ev.target.result);
            setFileEncoding('utf-8');
          };
          reader.readAsText(file, 'utf-8');
        }
      };
      input.click();
    }
  }, [loadFile]);

  // Handle drag & drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(txt|text|log|md)$/i.test(file.name)) {
      if (window.electronAPI && file.path) {
        loadFile(file.path);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFilePath(file.name);
          setFileName(file.name);
          setFileSize(file.size);
          setFileContent(ev.target.result);
          setFileEncoding('utf-8');
        };
        reader.readAsText(file, 'utf-8');
      }
    }
  }, [loadFile]);

  // Listen for macOS file-open events (runtime) + pull pending open-file (cold start)
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onFileOpened((filePath) => {
        loadFile(filePath);
      });
      // Cold start: pull the pending file (set by open-file event before app was ready)
      window.electronAPI.getPendingOpenFile().then((filePath) => {
        if (filePath) loadFile(filePath);
      });
      return cleanup;
    }
  }, [loadFile]);

  // Save reading position on scroll
  const handleScroll = useCallback((percent) => {
    setScrollPercent(percent);
  }, []);

  // Seek via progress slider
  const handleSeek = useCallback((percent) => {
    setScrollPercent(percent);
    if (readerRef.current) {
      readerRef.current.scrollToPosition(percent);
    }
  }, []);

  // Apply pending scroll position once Reader mounts with content.
  // Depend on filePath + fileContent so same-content-different-path / reopen
  // triggers restoration even when the text string is identical.
  useEffect(() => {
    if (pendingScrollRef.current !== null && readerRef.current && fileContent) {
      const pos = pendingScrollRef.current;
      pendingScrollRef.current = null;
      requestAnimationFrame(() => {
        if (readerRef.current) {
          readerRef.current.scrollToPosition(pos);
        }
      });
    }
  }, [filePath, fileContent]);

  // Save position periodically
  useEffect(() => {
    if (!filePath || !window.electronAPI) return;
    const timer = setTimeout(() => {
      window.electronAPI.setPosition(filePath, scrollPercent);
    }, 2000);
    return () => clearTimeout(timer);
  }, [filePath, scrollPercent]);

  // Search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (!query.trim() || !fileContent) {
      setSearchResults([]);
      setCurrentSearchIdx(0);
      return;
    }
    const results = [];
    const lowerContent = fileContent.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let idx = 0;
    while ((idx = lowerContent.indexOf(lowerQuery, idx)) !== -1) {
      results.push(idx);
      idx += lowerQuery.length;
    }
    setSearchResults(results);
    setCurrentSearchIdx(0);
  }, [fileContent]);

  const handleSearchNext = useCallback(() => {
    if (searchResults.length === 0) return;
    const next = (currentSearchIdx + 1) % searchResults.length;
    setCurrentSearchIdx(next);
    if (readerRef.current) {
      readerRef.current.scrollToPosition(searchResults[next] / fileContent.length);
    }
  }, [searchResults, currentSearchIdx, fileContent]);

  const handleSearchPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    const prev = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIdx(prev);
    if (readerRef.current) {
      readerRef.current.scrollToPosition(searchResults[prev] / fileContent.length);
    }
  }, [searchResults, currentSearchIdx, fileContent]);

  // Bookmark
  const handleAddBookmark = useCallback(async () => {
    if (!filePath) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    // Get surrounding text as label
    const pos = Math.floor(scrollPercent * fileContent.length);
    const snippet = fileContent.substring(Math.max(0, pos), Math.min(pos + 30, fileContent.length)).trim();
    await addBookmark({
      id,
      position: scrollPercent,
      label: snippet || `位置 ${Math.round(scrollPercent * 100)}%`,
      createdAt: new Date().toISOString(),
    });
  }, [filePath, scrollPercent, fileContent, addBookmark]);

  // TTS
  const handleTTS = useCallback((action) => {
    if (!ttsRef.current) return;
    switch (action) {
      case 'start':
        ttsRef.current.speak(fileContent, { rate: 0.9, lang: 'zh-CN' });
        break;
      case 'pause':
        ttsRef.current.pause();
        break;
      case 'resume':
        ttsRef.current.resume();
        break;
      case 'stop':
        ttsRef.current.stop();
        break;
    }
  }, [fileContent]);

  // Encoding change
  const handleEncodingChange = useCallback(async (encoding) => {
    updateSettings({ encoding });
    if (filePath) await loadFile(filePath, encoding);
  }, [filePath, loadFile, updateSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    return setupShortcuts({
      onOpenFile: handleOpenFile,
      onToggleSearch: () => setShowSearch((s) => !s),
      onAddBookmark: handleAddBookmark,
      onIncreaseFont: () => updateSettings({ fontSize: Math.min(settings.fontSize + 2, 40) }),
      onDecreaseFont: () => updateSettings({ fontSize: Math.max(settings.fontSize - 2, 12) }),
      onToggleTheme: () => {
        const themes = ['light', 'sepia', 'dark'];
        const idx = themes.indexOf(settings.theme);
        updateSettings({ theme: themes[(idx + 1) % 3] });
      },
      onToggleSidebar: () => setShowSidebar((s) => !s),
      onCloseOverlay: () => {
        setShowSearch(false);
        setShowSettings(false);
      },
    });
  }, [handleOpenFile, handleAddBookmark, settings, updateSettings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Show welcome screen when no file is loaded
  if (!loaded) return null;

  return (
    <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <Toolbar
        fileName={fileName}
        fileEncoding={fileEncoding}
        fileSize={fileSize}
        showSearch={showSearch}
        showSidebar={showSidebar}
        isSpeaking={ttsState.speaking}
        isPaused={ttsState.paused}
        ttsAvailable={ttsState.available}
        settings={settings}
        onUpdateSettings={updateSettings}
        onOpenFile={handleOpenFile}
        onToggleSearch={() => setShowSearch((s) => !s)}
        onToggleSidebar={() => setShowSidebar((s) => !s)}
        onToggleSettings={() => setShowSettings((s) => !s)}
        onTTS={handleTTS}
        onAddBookmark={handleAddBookmark}
        canAddBookmark={Boolean(filePath)}
      />

      {showSearch && (
        <SearchBar
          query={searchQuery}
          results={searchResults}
          currentIdx={currentSearchIdx}
          onSearch={handleSearch}
          onNext={handleSearchNext}
          onPrev={handleSearchPrev}
          onClose={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}
        />
      )}

      <div className="app-body">
        {showSidebar && (
          <Sidebar
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            chapters={chapters}
            bookmarks={bookmarks}
            recentFiles={recentFiles}
            filePath={filePath}
            fileContent={fileContent}
            currentPos={scrollPercent}
            onChapterClick={(pos) => readerRef.current && readerRef.current.scrollToTextPosition(pos)}
            onBookmarkClick={(pos) => readerRef.current && readerRef.current.scrollToPosition(pos)}
            onRemoveBookmark={removeBookmark}
            onOpenRecent={(path) => loadFile(path)}
            onRemoveRecent={removeRecent}
            onClearRecent={clearRecent}
            onClose={() => setShowSidebar(false)}
          />
        )}

        <main className="main-area">
          {!filePath ? (
            <div className="welcome">
              <div className="welcome-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h2>TXT 阅读器</h2>
              <p>打开或拖拽一个 .txt 文件开始阅读</p>
              <button className="btn btn-primary" onClick={handleOpenFile}>打开文件</button>
              <p className="welcome-hint">快捷键: ⌘O 打开文件 | ⌘F 搜索 | ⌘B 书签</p>
            </div>
          ) : fileLoading ? (
            <div className="welcome">
              <p>加载中...</p>
            </div>
          ) : (
            <>
              <div className="reader-info">
                <span className="reader-info-title">{fileName}</span>
                <span className="reader-info-meta">
                  {formatFileSize(fileSize)} · {scrollPercent > 0 ? `${Math.round(scrollPercent * 100)}%` : '0%'}
                </span>
              </div>
              <Reader
                ref={readerRef}
                content={fileContent}
                settings={settings}
                searchQuery={searchQuery}
                searchResults={searchResults}
                currentSearchIdx={currentSearchIdx}
                chapters={chapters}
                onScroll={handleScroll}
              />
            </>
          )}
        </main>
      </div>

      <div className="status-bar">
        <span className="status-file">{filePath ? fileName : '未打开文件'}</span>
        {filePath && (
          <div className="status-progress">
            <input
              type="range"
              className="progress-slider"
              min="0"
              max="100"
              step="0.1"
              value={Math.round(scrollPercent * 1000) / 10}
              onChange={(e) => handleSeek(Number(e.target.value) / 100)}
              title={`阅读进度: ${Math.round(scrollPercent * 100)}%`}
              aria-label="阅读进度"
            />
            <span className="progress-label">{Math.round(scrollPercent * 100)}%</span>
          </div>
        )}
        {fileEncoding && <span>编码: {fileEncoding.toUpperCase()}</span>}
        {fileSize > 0 && <span>{formatFileSize(fileSize)}</span>}
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          fileEncoding={fileEncoding}
          onUpdate={updateSettings}
          onEncodingChange={handleEncodingChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
