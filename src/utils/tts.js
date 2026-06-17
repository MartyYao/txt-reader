/**
 * Text-to-speech using Web Speech API.
 * Works in Electron's Chromium renderer.
 */
export function createTTS() {
  let utterance = null;
  let onStateChange = null;

  function getVoices() {
    return window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  }

  function findChineseVoice() {
    const voices = getVoices();
    // Prefer mainland Chinese, then any Chinese
    let voice = voices.find((v) => v.lang === 'zh-CN');
    if (!voice) voice = voices.find((v) => v.lang.startsWith('zh'));
    if (!voice) voice = voices.find((v) => v.lang === 'yue');
    return voice || null;
  }

  function speak(text, options = {}) {
    if (!window.speechSynthesis) return false;

    window.speechSynthesis.cancel();

    // Split long text into manageable chunks
    const maxChunk = 200;
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChunk) {
      const chunk = text.substring(i, i + maxChunk);
      // Try to break at sentence boundary
      const lastPeriod = Math.max(
        chunk.lastIndexOf('。'),
        chunk.lastIndexOf('？'),
        chunk.lastIndexOf('！'),
        chunk.lastIndexOf('\n')
      );
      const breakPoint = lastPeriod > maxChunk * 0.5 ? lastPeriod + 1 : maxChunk;
      chunks.push(chunk.substring(0, breakPoint));
      i = i + breakPoint - maxChunk;
    }

    function speakChunk(index) {
      if (index >= chunks.length) {
        if (onStateChange) onStateChange({ speaking: false, paused: false });
        return;
      }

      utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.lang = options.lang || 'zh-CN';

      const voice = findChineseVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => {
        if (onStateChange) onStateChange({ speaking: false, paused: false, error: true });
      };

      window.speechSynthesis.speak(utterance);
      if (onStateChange) onStateChange({ speaking: true, paused: false });
    }

    speakChunk(0);
    return true;
  }

  function pause() {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      if (onStateChange) onStateChange({ speaking: true, paused: true });
    }
  }

  function resume() {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      if (onStateChange) onStateChange({ speaking: true, paused: false });
    }
  }

  function stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      utterance = null;
      if (onStateChange) onStateChange({ speaking: false, paused: false });
    }
  }

  function isAvailable() {
    return !!(window.speechSynthesis);
  }

  function getState() {
    if (!window.speechSynthesis) return { speaking: false, paused: false, available: false };
    return {
      speaking: window.speechSynthesis.speaking,
      paused: window.speechSynthesis.paused,
      available: true,
    };
  }

  function setOnStateChange(callback) {
    onStateChange = callback;
  }

  return { speak, pause, resume, stop, isAvailable, getState, setOnStateChange, getVoices, findChineseVoice };
}
