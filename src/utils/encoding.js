export const ENCODING_OPTIONS = [
  { value: null, label: '自动检测' },
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'gbk', label: 'GBK / GB18030' },
  { value: 'big5', label: 'Big5 (繁体)' },
  { value: 'gb2312', label: 'GB2312' },
  { value: 'shift_jis', label: 'Shift JIS (日文)' },
  { value: 'euc-kr', label: 'EUC-KR (韩文)' },
  { value: 'utf-16', label: 'UTF-16' },
  { value: 'windows-1251', label: 'Windows-1251 (西里尔)' },
];

export function formatEncodingLabel(encoding) {
  const opt = ENCODING_OPTIONS.find((o) => o.value === encoding);
  return opt ? opt.label : encoding || '自动检测';
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
