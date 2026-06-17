import React from 'react';

export default function RecentFilesPanel({
  recentFiles, onOpenRecent, onRemoveRecent, onClearRecent,
}) {
  if (!recentFiles || recentFiles.length === 0) {
    return <div className="sidebar-empty">暂无最近文件</div>;
  }

  return (
    <>
      <div className="recent-header">
        <span className="recent-count">{recentFiles.length} 个文件</span>
        <button
          className="btn btn-sm recent-clear-btn"
          onClick={(e) => { e.stopPropagation(); onClearRecent(); }}
        >
          清空
        </button>
      </div>
      {recentFiles.map((file) => (
        <div
          key={file.path}
          className="sidebar-item"
          onClick={() => onOpenRecent(file.path, file.encoding)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="item-label" title={file.path}>{file.name}</span>
          <button
            className="item-action"
            title="从列表中移除"
            onClick={(e) => { e.stopPropagation(); onRemoveRecent(file.path); }}
          >
            ×
          </button>
        </div>
      ))}
    </>
  );
}
