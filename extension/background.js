// ScreenApp Recorder - Background Service Worker v2.0
// Handles: tab capture, state management, final upload

const API_BASE = 'https://screenapp-production-e5c2.up.railway.app';

console.log('[BG] Background service worker started at', new Date().toISOString());

// ─── State Management ──────────────────────────────────────────────────────────

function setRecordingState(state) {
  chrome.storage.session.set({ recordingState: state });
}

function getRecordingState() {
  return chrome.storage.session.get('recordingState').then(r => r.recordingState || null);
}

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[BG] Message:', msg.type);

  // GET_RECORDING_STATE — popup asks on init if recording is in progress
  if (msg.type === 'GET_RECORDING_STATE') {
    getRecordingState().then(state => {
      sendResponse({ state });
    });
    return true; // async response
  }

  // RECORDING_STARTED — popup tells us recording has begun
  if (msg.type === 'RECORDING_STARTED') {
    const state = {
      status: 'recording',
      startTime: msg.startTime || Date.now(),
      tabIds: msg.tabIds || [],
      tabCount: msg.tabCount || 1,
      title: msg.title || 'Recording'
    };
    setRecordingState(state);
    console.log('[BG] Saved recording state:', state);

    // Notify backend so dashboard can show live recording status
    fetch(`${API_BASE}/api/recordings/live-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        title: msg.title || `Recording ${msg.tabCount || 1} tab(s)`,
        tab_count: String(msg.tabCount || 1),
        start_time: String(msg.startTime || Date.now())
      })
    }).then(res => {
      if (res.ok) console.log('[BG] Live-state posted successfully');
      else console.warn('[BG] Live-state POST failed:', res.status);
    }).catch(err => console.warn('[BG] Live-state POST error:', err));

    sendResponse({ success: true });
    return true;
  }

  // RECORDING_STOPPED — popup tells us recording has ended
  if (msg.type === 'RECORDING_STOPPED') {
    setRecordingState(null);
    fetch(`${API_BASE}/api/recordings/live-state`, { method: 'DELETE' })
      .then(res => { if (res.ok) console.log('[BG] Live-state cleared'); })
      .catch(err => console.warn('[BG] Live-state DELETE error:', err));
    sendResponse({ success: true });
    return true;
  }

  // CLEAR_STALE_STATE — popup clears an old recording state on open
  if (msg.type === 'CLEAR_STALE_STATE') {
    setRecordingState(null);
    fetch(`${API_BASE}/api/recordings/live-state`, { method: 'DELETE' })
      .then(res => { if (res.ok) console.log('[BG] Stale state cleared'); })
      .catch(err => console.warn('[BG] Stale state clear error:', err));
    sendResponse({ success: true });
    return true;
  }

  // SET_BADGE — popup sets extension badge text
  if (msg.type === 'SET_BADGE') {
    chrome.action.setBadgeText({ text: msg.text || 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    sendResponse({ success: true });
    return true;
  }

  // CLEAR_BADGE — popup clears extension badge
  if (msg.type === 'CLEAR_BADGE') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
    return true;
  }

  // FINALIZE_RECORDING — popup sends the audio blob to upload
  if (msg.type === 'FINALIZE_RECORDING') {
    finalizeRecording(msg.arrayBuffer || msg.blob, msg.title, msg.tabCount || 1, msg.duration || 0, sendResponse);
    return true; // async response
  }

  // GET_MEDIA — popup asks for a media stream ID (for multi-tab picker support)
  if (msg.type === 'GET_MEDIA') {
    chrome.desktopCapture.chooseDesktopMedia(
      ['audio', 'tab'],
      null, // no targetTab — shows full picker
      function(streamId) {
        if (!streamId) {
          console.log('[BG] chooseDesktopMedia cancelled');
          sendResponse({ cancelled: true });
        } else {
          console.log('[BG] chooseDesktopMedia got streamId');
          sendResponse({ streamId: streamId });
        }
      }
    );
    return true; // async response
  }

  sendResponse({ success: false });
});

// ─── Upload Recording ────────────────────────────────────────────────────────

async function finalizeRecording(data, title, tabCount, duration, sendResponse) {
  console.log('[BG] finalizeRecording, title:', title, 'data type:', typeof data, 'size:', data ? data.byteLength || 0 : 0);

  try {
    if (!data || (data.byteLength || 0) < 1000) {
      console.log('[BG] Tiny or null data, clearing live-state');
      fetch(`${API_BASE}/api/recordings/live-state`, { method: 'DELETE' })
        .catch(function(){});
      sendResponse({ success: false, error: 'Recording too short or no audio captured' });
      return;
    }

    let blob;
    if (data.byteLength !== undefined) {
      blob = new Blob([data], { type: 'audio/webm' });
    } else {
      const res = await fetch(data);
      blob = await res.blob();
    }
    console.log('[BG] Blob size:', (blob.size / 1024).toFixed(1), 'KB');

    if (blob.size < 1000) {
      sendResponse({ success: false, error: 'Recording too short' });
      return;
    }

    const formData = new FormData();
    formData.append('title', title || 'Tab Recording');
    formData.append('file', blob, 'recording.webm');
    formData.append('duration', String(duration || 0));

    console.log('[BG] Uploading to:', `${API_BASE}/api/recordings/upload`);

    // Add timeout — if backend doesn't respond in 30s, give up
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${API_BASE}/api/recordings/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const result = await response.json();
      console.log('[BG] SUCCESS! Uploaded, ID:', result.id);

      setRecordingState(null);
      fetch(`${API_BASE}/api/recordings/live-state`, { method: 'DELETE' })
        .catch(function(){});

      sendResponse({ success: true, recordingId: result.id });
    } else {
      const text = await response.text();
      console.error('[BG] Upload failed:', response.status, text);
      setRecordingState(null);
      sendResponse({ success: false, error: 'Upload failed: ' + response.status });
    }
  } catch (err) {
    console.error('[BG] finalizeRecording error:', err.name || err.message);
    sendResponse({ success: false, error: err.name || err.message });
  }
}