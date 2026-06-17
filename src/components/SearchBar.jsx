import React, { useRef, useEffect, useCallback } from 'react';

export default function SearchBar({
  query, results, currentIdx,
  onSearch, onNext, onPrev, onClose,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onNext, onPrev, onClose]);

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="搜索..."
        onChange={(e) => onSearch(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <span className="search-info">
        {results.length > 0
          ? `${currentIdx + 1} / ${results.length}`
          : query ? '无结果' : ''}
      </span>

      <button
        className="btn btn-icon btn-sm"
        title="上一个 (⇧Enter)"
        onClick={onPrev}
        disabled={results.length === 0}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      <button
        className="btn btn-icon btn-sm"
        title="下一个 (Enter)"
        onClick={onNext}
        disabled={results.length === 0}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <button
        className="btn btn-icon btn-sm"
        title="关闭搜索"
        onClick={onClose}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
