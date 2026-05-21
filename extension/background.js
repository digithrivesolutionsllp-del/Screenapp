// ScreenApp Recorder - Background Service Worker v1.3
// Coordinates tab capture via chrome.tabCapture, returns streams to popup for recording

const API_BASE = 'http://localhost:8000';

let audioChunks = [];    // chunks from popup
let recordingTabs = [];
let uploadId = null;     // recording ID from backend

// ─── Message Handler ──────────────────────────────────────────────────────────

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

  // Popup sends tab IDs → start tab capture from each tab
  if (msg.type === 'START_RECORDING') {
    startCaptureTabs(msg.tabIds, sendResponse);
    return true;
  }

  // Popup sends audio chunks → accumulate them
  if (msg.type === 'AUDIO_CHUNK') {
    if (msg.data) {
      audioChunks.push(msg.data);
    }
    sendResponse({ success: true });
    return true;
  }

  // Popup sends final blob → upload
  if (msg.type === 'FINALIZE_RECORDING') {
    finalizeRecording(msg.blob, msg.title, sendResponse);
    return true;
  }

  if (msg.type === 'GET_STATUS') {
    sendResponse({ recording: false, tabCount: 0, tabs: [] });
    return true;
  }
});

// ─── Start Tab Capture ─────────────────────────────────────────────────────────
// chrome.tabCapture.capture() MUST be called from a tab context (popup counts)
async function startCaptureTabs(tabIds, sendResponse) {
  console.log('[BG] Starting capture for tabs:', tabIds);
  try {
    if (tabIds.length === 0) {
      sendResponse({ success: false, error: 'No tabs selected' });
      return;
    }

    // Tell popup to start recording the tab capture
    // Popup will create MediaRecorder and send chunks back
    chrome.runtime.sendMessage({
      type: 'BEGIN_TAB_CAPTURE',
      tabIds: tabIds,
    });
    sendResponse({ success: true, tabCount: tabIds.length });

  } catch (err) {
    console.error('[BG] startCaptureTabs error:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}

// ─── Upload Final Recording ───────────────────────────────────────────────────

async function finalizeRecording(blobDataUrl, title, sendResponse) {
  console.log('[BG] Finalizing recording, size:', blobDataUrl ? 'received' : 'null');
  try {
    if (!blobDataUrl) {
      sendResponse({ success: false, error: 'No audio recorded' });
      return;
    }

    // Convert data URL back to blob
    const res = await fetch(blobDataUrl);
    const blob = await res.blob();
    console.log('[BG] Final blob size:', (blob.size / 1024).toFixed(1), 'KB');

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
      chrome.runtime.sendMessage({ type: 'RECORDING_COMPLETE', recordingId: result.id, title, tabCount: recordingTabs.length });
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
