import React, { forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from 'react';

const Reader = forwardRef(function Reader(
  { content, settings, searchQuery, searchResults, currentSearchIdx, chapters, onScroll },
  ref
) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToPosition(pos) {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      el.scrollTop = Math.max(0, Math.min(pos * maxScroll, maxScroll));
    },
    scrollToTextPosition(charPosition) {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const paras = el.querySelectorAll('[data-position]');
      if (paras.length === 0) return;
      let target = paras[0];
      for (const p of paras) {
        const pPos = parseInt(p.getAttribute('data-position'), 10);
        if (pPos <= charPosition) {
          target = p;
        } else {
          break;
        }
      }
      el.scrollTop = Math.max(0, target.offsetTop - 20);
    },
    getScrollPosition() {
      if (!containerRef.current) return 0;
      const el = containerRef.current;
      if (el.scrollHeight <= el.clientHeight) return 0;
      return el.scrollTop / (el.scrollHeight - el.clientHeight);
    },
    containerRef,
  }));

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    if (el.scrollHeight <= el.clientHeight) {
      onScroll(0);
      return;
    }
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    onScroll(Math.max(0, Math.min(1, pct)));
  }, [onScroll]);

  // Build chapter position set for quick lookup
  const chapterPositions = useMemo(() => {
    const set = new Set();
    chapters.forEach((ch) => set.add(ch.position));
    return set;
  }, [chapters]);

  // Memoize rendered paragraphs
  const paragraphs = useMemo(() => {
    if (!content) return [];

    const lines = content.split('\n');
    const result = [];
    let paraStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isChapterHeading = chapterPositions.has(paraStart);

      if (line.trim() === '') {
        // Empty line marks paragraph break; still count its newline
        paraStart += line.length + 1; // +1 for newline
        continue;
      }

      result.push({
        text: line,
        isChapter: isChapterHeading,
        position: paraStart,
      });

      paraStart += line.length + 1; // +1 for newline
    }

    return result;
  }, [content, chapterPositions]);

  // Apply search highlighting to text
  const highlightText = useCallback((text, paraPosition) => {
    if (!searchQuery || searchResults.length === 0) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const currentGlobalPos = searchResults.length > 0
      ? searchResults[currentSearchIdx]
      : -1;
    const parts = [];
    let lastIdx = 0;
    let idx = 0;

    while ((idx = lowerText.indexOf(lowerQuery, lastIdx)) !== -1) {
      parts.push(text.substring(lastIdx, idx));
      const matchText = text.substring(idx, idx + lowerQuery.length);
      const globalPos = paraPosition + idx;
      const isCurrent = globalPos === currentGlobalPos;
      parts.push(
        <mark key={`m-${globalPos}`} className={isCurrent ? 'current' : ''}>{matchText}</mark>
      );
      lastIdx = idx + lowerQuery.length;
    }
    parts.push(text.substring(lastIdx));

    return parts.length > 1 ? parts : text;
  }, [searchQuery, searchResults, currentSearchIdx]);

  if (!content) {
    return <div className="reader" />;
  }

  return (
    <div
      className="reader"
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        '--font-size': `${settings.fontSize}px`,
        '--line-height': settings.lineHeight,
        '--reading-width': `${settings.readingWidth}px`,
        '--font-family': settings.fontFamily || 'inherit',
      }}
    >
      <div className="reader-content">
        {paragraphs.map((para, i) => (
          <p key={i} data-position={para.position} className={para.isChapter ? 'chapter-heading' : ''}>
            {highlightText(para.text, para.position)}
          </p>
        ))}
      </div>
    </div>
  );
});

export default Reader;
