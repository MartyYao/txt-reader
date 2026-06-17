import React from 'react';
import BookmarksPanel from './BookmarksPanel';
import RecentFilesPanel from './RecentFilesPanel';

export default function Sidebar({
  activeTab, onTabChange,
  chapters, bookmarks, recentFiles,
  filePath, fileContent, currentPos,
  onChapterClick, onBookmarkClick, onRemoveBookmark,
  onOpenRecent, onRemoveRecent, onClearRecent,
  onClose,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'chapters' ? 'active' : ''}`}
          onClick={() => onTabChange('chapters')}
        >
          目录
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => onTabChange('bookmarks')}
        >
          书签
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => onTabChange('recent')}
        >
          最近
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'chapters' && (
          <ChapterList
            chapters={chapters}
            fileContent={fileContent}
            currentPos={currentPos}
            onChapterClick={onChapterClick}
          />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksPanel
            bookmarks={bookmarks}
            filePath={filePath}
            currentPos={currentPos}
            onBookmarkClick={onBookmarkClick}
            onRemoveBookmark={onRemoveBookmark}
          />
        )}

        {activeTab === 'recent' && (
          <RecentFilesPanel
            recentFiles={recentFiles}
            onOpenRecent={onOpenRecent}
            onRemoveRecent={onRemoveRecent}
            onClearRecent={onClearRecent}
          />
        )}
      </div>
    </aside>
  );
}

function ChapterList({ chapters, fileContent, currentPos, onChapterClick }) {
  if (!chapters || chapters.length === 0) {
    return <div className="sidebar-empty">未检测到章节标题</div>;
  }

  return (
    <>
      {chapters.map((ch, i) => {
        const chRatio = ch.position / (fileContent ? fileContent.length : 1);
        const isCurrent = currentPos >= chRatio &&
          (i === chapters.length - 1 || currentPos < chapters[i + 1].position / fileContent.length);

        return (
          <button
            key={i}
            className="sidebar-item"
            style={isCurrent ? { color: 'var(--accent)', fontWeight: 600 } : {}}
            onClick={() => onChapterClick(ch.position)}
          >
            <span className="item-label">{ch.title}</span>
            <span className="item-meta">第{ch.lineNumber}行</span>
          </button>
        );
      })}
    </>
  );
}
