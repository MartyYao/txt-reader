import React from 'react';

export default function BookmarksPanel({
  bookmarks, filePath, currentPos,
  onBookmarkClick, onRemoveBookmark,
}) {
  if (!filePath) {
    return <div className="sidebar-empty">请先打开文件</div>;
  }

  if (!bookmarks || bookmarks.length === 0) {
    return <div className="sidebar-empty">暂无书签</div>;
  }

  const sorted = [...bookmarks].sort((a, b) => a.position - b.position);

  return (
    <>
      {sorted.map((bm) => {
        const isNearby = Math.abs(bm.position - currentPos) < 0.02;

        return (
          <div
            key={bm.id}
            className="sidebar-item"
            style={isNearby ? { color: 'var(--accent)' } : {}}
            onClick={() => onBookmarkClick(bm.position)}
          >
            <span className="item-label">{bm.label}</span>
            <span className="item-meta">{Math.round(bm.position * 100)}%</span>
            <button
              className="item-action"
              title="删除书签"
              onClick={(e) => { e.stopPropagation(); onRemoveBookmark(bm.id); }}
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}
