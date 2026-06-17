/**
 * Detect chapter headings in text via line-by-line scanning.
 * Returns array of { title, position, lineNumber }
 *
 * position = character offset of the line start within `text`,
 * matching the data-position tracking in Reader.jsx so chapter
 * click navigation stays accurate.
 *
 * Rules:
 *  - Only whole physical lines that look like chapter headings are kept.
 *  - Outer paired brackets/quotes are stripped before matching.
 *  - Strong chapter prefixes such as "第一章", "第1章、标题", or
 *    "第1章 第一章 1 标题" are accepted even when the rest of the line
 *    looks like prose, because many TXT novels keep the whole chapter lead
 *    on one physical line.
 *  - Ordinary numbered headings such as "一、标题" / "1. 标题" stay
 *    conservative and still reject obvious prose punctuation.
 *  - Very long stripped lines are rejected to avoid treating paragraphs as
 *    chapters.
 */

// ── Paired bracket/quotation marks ──────────────────────────
const BRACKET_PAIRS = Object.entries({
  '【': '】', '「': '」', '『': '』', '《': '》', '〈': '〉',
  '（': '）', '(': ')', '{': '}', '[': ']',
  '〔': '〕', '［': '］', '｛': '｝',
});

/** Repeatedly strip outermost matching bracket pairs */
function stripBrackets(s) {
  let prev = '';
  while (prev !== s) {
    prev = s;
    for (const [open, close] of BRACKET_PAIRS) {
      if (s.length >= open.length + close.length &&
          s.startsWith(open) && s.endsWith(close)) {
        s = s.slice(open.length, s.length - close.length);
        break;
      }
    }
  }
  return s;
}

// ── Numeral / keyword building blocks ──────────────────────
const CN = '[零〇一二两三四五六七八九十百千万亿]+';
const AN = '\\d+';
const NUM = `(?:${CN}|${AN})`;
const KEY = '[章节卷部篇回节]';
const SEP = `[\\s　：:.．\\-－]+`;
const STRONG_SEP = `[\\s　：:、，,.．\\-－]*`;
const STRONG_LIMIT = 120;
const ORDINARY_LIMIT = 60;

// ── Anchored whole-line patterns (applied after bracket-strip) ─

// (S) Strong chapter prefix at line start. This accepts looser suffix text
//     because real TXT chapters may be formatted like prose:
//     第一章、风起青萍 / 第1章 第一章 1 风起青萍 / 第一章 我走进房间，发现...
const strongChapterRe = new RegExp(
  `^(?:第)?${NUM}${KEY}(?:${STRONG_SEP}[^\\n]{0,100})?$`
);

// (A)  optional 第 + numeral + key  + optional separator (.．：: etc) + title
//     第一章 / 第1章 / 1章 / 一章 / 第一节 / 1节 / 一节 / 第1章：买处 / 第1章．标题
const ordinalKeyRe = new RegExp(
  `^(?:第)?${NUM}${KEY}(?:${SEP}([^\\n]{1,50}))?$`
);

// (B)  numeral + 、/./．+ title (separator must NOT be followed by digit)
//     一、风起青萍 / 1. 风起青萍 / 一．风起青萍
const numberedTitleRe = new RegExp(
  `^${NUM}[、.．](?!\\d)[\\s　]*([^\\n]{1,50})$`
);

// (C)  卷/部/篇 + numeral  + optional title  →  卷一 / 篇三 / 卷一 风起
const juanRe = new RegExp(
  `^[卷部篇][\\s　]*${NUM}(?:${SEP}([^\\n]{1,50}))?$`
);

// (D)  Named chapters  →  序章 / 番外 / 前言 / 附录 等
const specialRe = new RegExp(
  `^(序章|终章|前言|楔子|引子|后记|尾声|番外|附录|跋|凡例|导读|序)(?:${SEP}([^\\n]{1,50}))?$`
);

// (E)  English "Chapter N …"
const enRe = /^[Cc]hapter\s+\d+(?:[\s.:：\-－]+([^\n]{1,50}))?$/;

// (F)  Pure Chinese numeral or 1-4 digit Arabic (for (1)→1, （十二）→十二, (1000)→1000)
const numOnlyRe = new RegExp(`^(${CN}|\\d{1,4})$`);

// ── Prose rejection helpers ────────────────────────────────

// Global early-reject (、 is NOT here — it is legal as a number separator)
const GLOBAL_PROSE = /[，,。！？?!；;]/;

// Title must not contain any of these (、 is rejected inside titles)
const TITLE_PROSE = /[，,。！？?!；;、]/;

/** Return true when `title` (a regex capture that may be undefined) is clean. */
function titleOk(title) {
  if (!title) return true;
  return !TITLE_PROSE.test(title);
}

// ── Main detector ──────────────────────────────────────────

export function detectChapters(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const chapters = [];
  let charPos = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineStart = charPos;
    charPos += lines[i].length + 1;                        // +1 for \n

    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const stripped = stripBrackets(trimmed);
    if (!stripped) continue;

    if (stripped.length > STRONG_LIMIT) continue;

    // Strong chapter lines are allowed to contain prose punctuation after
    // the chapter prefix, as long as they remain a single short line.
    let ok = strongChapterRe.test(stripped);

    // ── Try each pattern; extract optional title from capture group 1 ──
    let m;

    if (!ok) {
      // ── Fast-reject for ordinary numbered/special headings ──
      if (GLOBAL_PROSE.test(stripped)) continue;
      if (stripped.length > ORDINARY_LIMIT) continue;

      m = ordinalKeyRe.exec(stripped);
      if (m && titleOk(m[1])) { ok = true; }
    }

    if (!ok) {
      m = numberedTitleRe.exec(stripped);
      if (m && titleOk(m[1])) { ok = true; }
    }

    if (!ok) {
      m = juanRe.exec(stripped);
      if (m && titleOk(m[1])) { ok = true; }
    }

    if (!ok) {
      m = specialRe.exec(stripped);
      if (m && titleOk(m[1])) { ok = true; }
    }

    if (!ok) {
      m = enRe.exec(stripped);
      if (m && titleOk(m[1])) { ok = true; }
    }

    if (!ok) {
      ok = numOnlyRe.test(stripped);
    }

    if (ok) {
      chapters.push({
        title: trimmed,
        position: lineStart,
        lineNumber: i + 1,
      });
    }
  }

  return chapters;
}

/**
 * Get chapter content range for a given chapter
 */
export function getChapterRange(text, chapters, chapterIndex) {
  const start = chapters[chapterIndex].position;
  const end = chapterIndex < chapters.length - 1
    ? chapters[chapterIndex + 1].position
    : text.length;
  return { start, end };
}
