/**
 * Keyboard shortcut definitions and handlers.
 * Returns a cleanup function.
 */
export function setupShortcuts(handlers) {
  const {
    onOpenFile,
    onToggleSearch,
    onAddBookmark,
    onIncreaseFont,
    onDecreaseFont,
    onToggleTheme,
    onToggleSidebar,
    onCloseOverlay,
  } = handlers;

  function handleKeyDown(e) {
    const mod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl+O: Open file
    if (mod && e.key === 'o') {
      e.preventDefault();
      if (onOpenFile) onOpenFile();
      return;
    }

    // Cmd/Ctrl+F: Search
    if (mod && e.key === 'f') {
      e.preventDefault();
      if (onToggleSearch) onToggleSearch();
      return;
    }

    // Cmd/Ctrl+B: Add bookmark
    if (mod && e.key === 'b') {
      e.preventDefault();
      if (onAddBookmark) onAddBookmark();
      return;
    }

    // Cmd/Ctrl+= or Cmd/Ctrl+Plus: Increase font
    if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      if (onIncreaseFont) onIncreaseFont();
      return;
    }

    // Cmd/Ctrl+-: Decrease font
    if (mod && e.key === '-') {
      e.preventDefault();
      if (onDecreaseFont) onDecreaseFont();
      return;
    }

    // Cmd/Ctrl+T: Toggle theme
    if (mod && e.key === 't' && !e.shiftKey) {
      e.preventDefault();
      if (onToggleTheme) onToggleTheme();
      return;
    }

    // Cmd/Ctrl+S: Toggle sidebar
    if (mod && e.key === 's') {
      e.preventDefault();
      if (onToggleSidebar) onToggleSidebar();
      return;
    }

    // Escape: Close overlays
    if (e.key === 'Escape') {
      if (onCloseOverlay) onCloseOverlay();
      return;
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}
