import React from 'react';
import { ENCODING_OPTIONS } from '../utils/encoding';
import { FONT_OPTIONS } from '../utils/fonts';

export default function SettingsPanel({
  settings, fileEncoding,
  onUpdate, onEncodingChange, onClose,
}) {
  const themes = [
    { value: 'light', label: '浅色' },
    { value: 'sepia', label: '护眼' },
    { value: 'dark', label: '深色' },
  ];

  return (
    <div className="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h3>阅读设置</h3>
          <button className="btn btn-icon" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Theme */}
        <div className="settings-group">
          <label>主题</label>
          <div className="theme-options">
            {themes.map((t) => (
              <button
                key={t.value}
                className={`theme-btn ${settings.theme === t.value ? 'active' : ''}`}
                onClick={() => onUpdate({ theme: t.value })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div className="settings-group">
          <label>阅读字体</label>
          <select
            value={settings.fontFamily || ''}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="settings-group">
          <label>
            字体大小
            <span className="settings-range-value">{settings.fontSize}px</span>
          </label>
          <input
            type="range"
            min="12"
            max="40"
            step="1"
            value={settings.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
          />
        </div>

        {/* Line Height */}
        <div className="settings-group">
          <label>
            行高
            <span className="settings-range-value">{settings.lineHeight.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="1.2"
            max="3.0"
            step="0.1"
            value={settings.lineHeight}
            onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
          />
        </div>

        {/* Reading Width */}
        <div className="settings-group">
          <label>
            阅读宽度
            <span className="settings-range-value">{settings.readingWidth}px</span>
          </label>
          <input
            type="range"
            min="400"
            max="1200"
            step="50"
            value={settings.readingWidth}
            onChange={(e) => onUpdate({ readingWidth: Number(e.target.value) })}
          />
        </div>

        {/* Encoding */}
        <div className="settings-group">
          <label>文本编码</label>
          <select
            value={fileEncoding || ''}
            onChange={(e) => onEncodingChange(e.target.value || null)}
          >
            {ENCODING_OPTIONS.map((opt) => (
              <option key={opt.value || 'auto'} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="settings-group" style={{ marginTop: 24, marginBottom: 0 }}>
          <label>快捷键</label>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
            <div><kbd style={kbdStyle}>⌘O</kbd> 打开文件</div>
            <div><kbd style={kbdStyle}>⌘F</kbd> 搜索</div>
            <div><kbd style={kbdStyle}>⌘B</kbd> 添加书签</div>
            <div><kbd style={kbdStyle}>⌘+/-</kbd> 调整字号</div>
            <div><kbd style={kbdStyle}>⌘T</kbd> 切换主题</div>
            <div><kbd style={kbdStyle}>⌘S</kbd> 侧边栏</div>
            <div><kbd style={kbdStyle}>Esc</kbd> 关闭面板</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const kbdStyle = {
  display: 'inline-block',
  padding: '1px 6px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'monospace',
  marginRight: 4,
  minWidth: 28,
  textAlign: 'center',
};
