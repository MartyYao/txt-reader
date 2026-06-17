import React from 'react';
import { FONT_OPTIONS } from '../utils/fonts';

export default function Toolbar({
  fileName, fileEncoding, fileSize,
  showSearch, showSidebar,
  isSpeaking, isPaused, ttsAvailable,
  settings, onUpdateSettings,
  onOpenFile, onToggleSearch, onToggleSidebar, onToggleSettings, onTTS,
  onAddBookmark, canAddBookmark,
}) {
  const handleFontChange = (e) => {
    onUpdateSettings({ fontFamily: e.target.value });
  };

  const increaseFont = () => {
    onUpdateSettings({ fontSize: Math.min(settings.fontSize + 1, 40) });
  };

  const decreaseFont = () => {
    onUpdateSettings({ fontSize: Math.max(settings.fontSize - 1, 12) });
  };

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button className="btn btn-icon" title="打开文件 (⌘O)" onClick={onOpenFile}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
        </button>

        <button
          className={`btn btn-icon ${showSidebar ? 'active' : ''}`}
          title="侧边栏 (⌘S)"
          onClick={onToggleSidebar}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      </div>

      <div className="toolbar-spacer" />
      <span className="toolbar-title">{fileName || 'TXT 阅读器'}</span>

      {/* Font controls */}
      <div className="toolbar-font-controls">
        <select
          className="toolbar-font-select"
          value={settings?.fontFamily ?? ''}
          onChange={handleFontChange}
          title="阅读字体"
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          className="btn btn-icon toolbar-font-btn"
          title="缩小字号 (⌘-)"
          onClick={decreaseFont}
          disabled={settings && settings.fontSize <= 12}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        <span className="toolbar-font-size">{settings ? settings.fontSize : 18}</span>

        <button
          className="btn btn-icon toolbar-font-btn"
          title="增大字号 (⌘+)"
          onClick={increaseFont}
          disabled={settings && settings.fontSize >= 40}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        {/* TTS Controls */}
        <button
          className={`btn btn-icon ${isSpeaking ? 'active' : ''}`}
          title={isSpeaking && !isPaused ? '暂停朗读' : isPaused ? '继续朗读' : '开始朗读'}
          disabled={!ttsAvailable}
          onClick={() => {
            if (isSpeaking && !isPaused) onTTS('pause');
            else if (isPaused) onTTS('resume');
            else onTTS('start');
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isSpeaking && !isPaused ? (
              <>
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </>
            ) : (
              <polygon points="5 3 19 12 5 21 5 3"/>
            )}
          </svg>
        </button>

        {isSpeaking && (
          <button
            className="btn btn-icon"
            title="停止朗读"
            onClick={() => onTTS('stop')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
          </button>
        )}

        <button
          className="btn btn-icon"
          title="添加书签 (⌘B)"
          aria-label="添加书签 (⌘B)"
          disabled={!canAddBookmark}
          onClick={onAddBookmark}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        <button
          className={`btn btn-icon ${showSearch ? 'active' : ''}`}
          title="搜索 (⌘F)"
          onClick={onToggleSearch}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        <button
          className="btn btn-icon"
          title="设置"
          onClick={onToggleSettings}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
