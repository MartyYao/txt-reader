import { useMemo } from 'react';
import { detectChapters } from '../utils/chapterDetection';

export function useChapterDetection(content) {
  const chapters = useMemo(() => {
    if (!content) return [];
    return detectChapters(content);
  }, [content]);

  return chapters;
}
