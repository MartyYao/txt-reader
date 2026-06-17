/**
 * Font family options for the reader content area.
 * Labels are displayed to the user; values are CSS font-family strings.
 */
export const FONT_OPTIONS = [
  {
    label: '系统默认',
    value: '',
  },
  {
    label: '宋体 / 衬线',
    value: '"Songti SC", "STSong", "Noto Serif CJK SC", "PingFang SC", serif',
  },
  {
    label: '苹方 / 无衬线',
    value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  },
  {
    label: '黑体',
    value: '"Heiti SC", "STHeiti", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    label: '楷体',
    value: '"Kaiti SC", "STKaiti", "KaiTi", "PingFang SC", serif',
  },
];

/**
 * Resolve a font-family value to its label for display.
 * Falls back to the first matching option or a trimmed string.
 */
export function getFontLabel(value) {
  const match = FONT_OPTIONS.find((opt) => opt.value === value);
  if (match) return match.label;
  // For legacy settings or custom values, show a short fallback
  if (!value) return FONT_OPTIONS[0].label;
  // Extract the first font name for display
  const first = value.split(',')[0].replace(/['"]/g, '').trim();
  return first || '自定义';
}
