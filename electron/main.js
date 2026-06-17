const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow = null;
let pendingOpenFile = null;
let storePath = '';
let storeCache = null;

function getStorePath() {
  if (!storePath) {
    const userData = app.getPath('userData');
    storePath = path.join(userData, 'reader-store.json');
  }
  return storePath;
}

function loadStore() {
  if (storeCache) return storeCache;
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8');
    storeCache = JSON.parse(raw);
  } catch {
    storeCache = { settings: {}, recentFiles: [], bookmarks: {}, positions: {} };
  }
  return storeCache;
}

function saveStore(store) {
  storeCache = store;
  try {
    fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save store:', e);
  }
}

function getStore() {
  return loadStore();
}

function updateStore(updater) {
  const store = loadStore();
  updater(store);
  saveStore(store);
  return store;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    title: 'TXT 阅读器',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC Handlers ──────────────────────────────────────────────

// Open file dialog
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开 TXT 文件',
    filters: [
      { name: 'Text Files', extensions: ['txt', 'text', 'log', 'md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Read file with encoding detection.
// When encodingHint is given (user manually selected an encoding) use it
// directly.  Otherwise auto-detect via BOM → multi-candidate scoring.
ipcMain.handle('file:read', async (_event, filePath, encodingHint) => {
  const iconv = require('iconv-lite');
  const buffer = fs.readFileSync(filePath);

  // ── Explicit hint ──────────────────────────────────────────
  if (encodingHint) {
    let text;
    try {
      text = iconv.decode(buffer, encodingHint);
    } catch {
      text = iconv.decode(buffer, 'utf-8');
      encodingHint = 'utf-8';
    }
    return { text, encoding: encodingHint, size: buffer.length };
  }

  // ── BOM detection ──────────────────────────────────────────
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return { text: iconv.decode(buffer.slice(3), 'utf-8'), encoding: 'utf-8-bom', size: buffer.length };
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return { text: iconv.decode(buffer.slice(2), 'utf-16le'), encoding: 'utf-16le', size: buffer.length };
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return { text: iconv.decode(buffer.slice(2), 'utf-16be'), encoding: 'utf-16be', size: buffer.length };
  }

  // ── Multi-candidate scoring ────────────────────────────────
  const sample = buffer.slice(0, Math.min(buffer.length, 65536));

  function scoreText(text, enc) {
    const len = text.length;
    if (len === 0) return { score: 0, cjk: 0, replacements: 0 };

    // Replacement characters (U+FFFD) — heavy penalty
    const replacements = (text.match(/�/g) || []).length;
    if (replacements / len > 0.03) return { score: -Infinity, cjk: 0, replacements };

    let score = 0;
    score -= replacements * 100;

    // Null bytes — strong signal of wrong 16-bit decode
    const nulls = (text.match(/\u0000/g) || []).length;
    score -= nulls * 30;

    // Unprintable control characters
    const controls = (text.match(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g) || []).length;
    score -= controls * 10;

    // CJK unified ideographs
    const cjk = (text.match(/[一-鿿]/g) || []).length;
    score += cjk * 3;

    // Hiragana + Katakana
    const kana = (text.match(/[぀-ゟ゠-ヿ]/g) || []).length;
    score += kana * 3;

    // Korean Hangul
    const hangul = (text.match(/[가-힯]/g) || []).length;
    score += hangul * 3;

    // Cyrillic — lower weight to avoid GBK→windows-1251 misdetection
    const cyrillic = (text.match(/[Ѐ-ӿ]/g) || []).length;
    score += cyrillic * 1;

    // ASCII readable chars
    const ascii = (text.match(/[A-Za-z0-9 \n\r\t.,;:!?()\-_'"\/]/g) || []).length;
    score += ascii * 1;

    // CJK punctuation / fullwidth forms
    const fw = (text.match(/[　-〿＀-￯]/g) || []).length;
    score += fw * 2;

    // Latin-1 accented chars: legitimate for European text,
    // but mojibake when CJK is present (GBK→ISO-8859-1 produces these)
    const latinHi = (text.match(/[À-ÿ]/g) || []).length;
    const totalCJK = cjk + kana + hangul;
    if (totalCJK > 0) {
      score -= latinHi * 8;
    } else {
      score += latinHi * 0.5;
    }

    // Strong bonus for CJK-native encodings when CJK content exists
    if (totalCJK > 0) {
      const cjkEncs = ['gb18030', 'gbk', 'gb2312', 'big5', 'shift_jis', 'euc-kr'];
      if (cjkEncs.includes(enc)) score += 200;
    }

    // Pure ASCII → prefer UTF-8
    if (totalCJK === 0 && cyrillic === 0 && ascii / len > 0.95) {
      if (enc === 'utf-8') score += 10;
    }

    return { score, cjk: totalCJK, replacements };
  }

  const candidates = [
    'gb18030', 'gbk', 'utf-8', 'big5', 'shift_jis',
    'euc-kr', 'windows-1251',
  ];

  let best = { encoding: 'utf-8', score: -Infinity };

  for (const enc of candidates) {
    try {
      const decoded = iconv.decode(sample, enc);
      const s = scoreText(decoded, enc);
      // Fast-accept: CJK encoding with no replacements and real CJK chars
      if (s.cjk > 5 && s.replacements === 0 && ['gb18030', 'gbk'].includes(enc)) {
        best = { encoding: enc, score: s.score };
        break;
      }
      if (s.score > best.score) {
        best = { encoding: enc, score: s.score };
      }
    } catch {
      // skip unsupported encoding
    }
  }

  // ── Decode full buffer with best encoding ──────────────────
  let text;
  let finalEncoding = best.encoding;
  try {
    text = iconv.decode(buffer, finalEncoding);
  } catch {
    finalEncoding = 'utf-8';
    text = iconv.decode(buffer, 'utf-8');
  }

  // Normalise gb18030 / gb2312 → gbk for display
  const displayEncoding = (finalEncoding === 'gb18030' || finalEncoding === 'gb2312') ? 'gbk' : finalEncoding;

  return { text, encoding: displayEncoding, size: buffer.length };
});

// Get file info
ipcMain.handle('file:getInfo', async (_event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
});

// ── Settings ───────────────────────────────────────────────────

ipcMain.handle('settings:get', async () => {
  const store = getStore();
  return store.settings || {};
});

ipcMain.handle('settings:set', async (_event, settings) => {
  updateStore((store) => {
    store.settings = { ...store.settings, ...settings };
  });
  return true;
});

// ── Recent Files ───────────────────────────────────────────────

ipcMain.handle('recent:get', async () => {
  const store = getStore();
  return (store.recentFiles || []).slice(0, 50);
});

ipcMain.handle('recent:add', async (_event, file) => {
  updateStore((store) => {
    if (!store.recentFiles) store.recentFiles = [];
    store.recentFiles = store.recentFiles.filter((f) => f.path !== file.path);
    store.recentFiles.unshift({
      ...file,
      lastOpened: new Date().toISOString(),
    });
    store.recentFiles = store.recentFiles.slice(0, 50);
  });
  return true;
});

ipcMain.handle('recent:remove', async (_event, filePath) => {
  updateStore((store) => {
    store.recentFiles = (store.recentFiles || []).filter((f) => f.path !== filePath);
  });
  return true;
});

ipcMain.handle('recent:clear', async () => {
  updateStore((store) => {
    store.recentFiles = [];
  });
  return true;
});

// ── Bookmarks ──────────────────────────────────────────────────

ipcMain.handle('bookmarks:get', async (_event, filePath) => {
  const store = getStore();
  return (store.bookmarks && store.bookmarks[filePath]) ? store.bookmarks[filePath] : [];
});

ipcMain.handle('bookmarks:add', async (_event, filePath, bookmark) => {
  updateStore((store) => {
    if (!store.bookmarks) store.bookmarks = {};
    if (!store.bookmarks[filePath]) store.bookmarks[filePath] = [];
    store.bookmarks[filePath].push(bookmark);
  });
  return true;
});

ipcMain.handle('bookmarks:remove', async (_event, filePath, bookmarkId) => {
  updateStore((store) => {
    if (!store.bookmarks) store.bookmarks = {};
    if (!store.bookmarks[filePath]) store.bookmarks[filePath] = [];
    store.bookmarks[filePath] = store.bookmarks[filePath].filter((b) => b.id !== bookmarkId);
  });
  return true;
});

// ── Reading Position ───────────────────────────────────────────

ipcMain.handle('position:get', async (_event, filePath) => {
  const store = getStore();
  return (store.positions && store.positions[filePath]) || 0;
});

ipcMain.handle('position:set', async (_event, filePath, position) => {
  updateStore((store) => {
    if (!store.positions) store.positions = {};
    store.positions[filePath] = position;
  });
  return true;
});

// ── File drop from OS ──────────────────────────────────────────

ipcMain.handle('file:openPath', async (_event, filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return filePath;
});

// ── App lifecycle ──────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file open events (macOS open-with)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  pendingOpenFile = filePath;
  // Window exists and is ready → send directly
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send('file:opened', filePath);
    return;
  }
  // App is ready but no window (e.g. all windows closed on macOS) → create one
  if (app.isReady() && !mainWindow) {
    createWindow();
  }
  // Otherwise app not ready yet → pendingOpenFile will be picked up after whenReady
});

// IPC: renderer pulls the pending open-file path on startup
ipcMain.handle('file:getPendingOpenFile', () => {
  const p = pendingOpenFile;
  pendingOpenFile = null;
  return p;
});
