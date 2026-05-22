// ScreenApp Recorder - Background Service Worker v1.4
// Handles: tab listing, final upload

const API_BASE = 'http://localhost:8000';

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[BG] Message:', msg.type);

  if (msg.type === 'GET_TABS') {
    chrome.tabs.query({}).then(tabs => {
      const filtered = tabs.filter(t =>
        t.url &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('devtools://') &&
        !t.url.startsWith('about:') &&
        !t.url.startsWith('file://')
      );
      sendResponse({ tabs: filtered.map(t => ({
        id: t.id,
        title: (t.title || 'Untitled').substring(0, 60),
        url: t.url,
        favIconUrl: t.favIconUrl,
        active: t.active
      }))});
    });
    return true;
  }

  if (msg.type === 'FINALIZE_RECORDING') {
    finalizeRecording(msg.blob, msg.title, sendResponse);
    return true;
  }

  // Forward TAB_CAPTURE_READY and TAB_CAPTURE_ERROR to popup
  if (msg.type === 'TAB_CAPTURE_READY' || msg.type === 'TAB_CAPTURE_ERROR') {
    chrome.runtime.sendMessage(msg);
    sendResponse({ success: true });
    return true;
  }

  sendResponse({ success: false });
});

// ─── Upload Recording ────────────────────────────────────────────────────────

async function finalizeRecording(dataUrl, title, sendResponse) {
  console.log('[BG] finalizeRecording, title:', title);
  try {
    if (!dataUrl) {
      sendResponse({ success: false, error: 'No audio data' });
      return;
    }

    // Convert data URL to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    console.log('[BG] Blob size:', (blob.size / 1024).toFixed(1), 'KB');

    const formData = new FormData();
    formData.append('title', title || 'Tab Recording');
    formData.append('file', blob, 'recording.webm');

    const response = await fetch(`${API_BASE}/api/recordings/upload`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[BG] Uploaded, ID:', result.id);
      chrome.runtime.sendMessage({
        type: 'RECORDING_COMPLETE',
        recordingId: result.id,
        title,
        tabCount: 1
      });
      sendResponse({ success: true, recordingId: result.id });
    } else {
      const text = await response.text();
      console.error('[BG] Upload failed:', response.status, text);
      chrome.runtime.sendMessage({ type: 'UPLOAD_FAILED', error: `Upload failed: ${response.status}` });
      sendResponse({ success: false, error: `Upload failed: ${response.status}` });
    }
  } catch (err) {
    console.error('[BG] finalizeRecording error:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}
