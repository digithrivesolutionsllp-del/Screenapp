// ScreenApp Recorder - Background Service Worker
// Handles multi-tab audio capture and recording via chrome.scripting API

const API_BASE = 'http://localhost:8000';

let mediaRecorder = null;
let audioChunks = [];
let recordingTabs = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[BG] Message received:', msg.type, 'at', new Date().toISOString());
  if (msg.type === 'GET_TABS') {
    chrome.tabs.query({}).then(tabs => {
      const filtered = tabs.filter(t =>
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('devtools://') &&
        !t.url.startsWith('about:') &&
        !t.url.startsWith('file://') &&
        t.url !== ''
      );
      sendResponse({ tabs: filtered.map(t => ({
        id: t.id,
        title: t.title.substring(0, 60) || 'Untitled',
        url: t.url,
        favIconUrl: t.favIconUrl,
        active: t.active
      }))});
    });
    return true;
  }

  // Content script sends audio data
  if (msg.type === 'AUDIO_CHUNK') {
    const tabId = sender.tab?.id;
    if (tabId) chrome.runtime.sendMessage({ type: 'TAB_STATUS', tabId: tabId, status: 'recording' });
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try {
        const binary = atob(msg.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        audioChunks.push(new Blob([bytes], { type: 'audio/webm' }));
      } catch (e) { /* ignore bad chunks */ }
    }
    sendResponse({ success: true });
    return true;
  }

  // Content script confirms capture started
  if (msg.type === 'CAPTURE_STARTED') {
    const tabId = sender.tab?.id;
    chrome.runtime.sendMessage({ type: 'TAB_CAPTURE_STARTED', tabId: tabId });
    sendResponse({ success: true });
    return true;
  }

  // Content script reports an error
  if (msg.type === 'CAPTURE_ERROR') {
    chrome.runtime.sendMessage({ type: 'TAB_CAPTURE_ERROR', tabId: msg.tabId, error: msg.error });
    sendResponse({ success: true });
    return true;
  }

  // Start recording selected tabs
  if (msg.type === 'START_RECORDING') {
    console.log('[BG] START_RECORDING called for tabs:', msg.tabIds);
    startRecording(msg.tabIds, sendResponse);
    return true;
  }

  // Stop and save recording
  if (msg.type === 'STOP_RECORDING') {
    stopRecording(sendResponse);
    return true;
  }

  // Get current status
  if (msg.type === 'GET_STATUS') {
    sendResponse({
      recording: mediaRecorder !== null && mediaRecorder.state === 'recording',
      tabCount: recordingTabs.length,
      tabs: recordingTabs
    });
    return true;
  }
});

// Content script to inject into each tab for audio capture
const CAPTURE_SCRIPT = `
// Tab-specific capture - inject per tab
(function() {
  let tabId = null;
  let recorder = null;
  let stream = null;

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'STOP_CAPTURE') {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
    }
  });

  // Start capturing tab audio
  function startCapture() {
    // Get this tab's audio using tabCapture
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(s => {
        stream = s;
        const chunks = [];
        recorder = new MediaRecorder(s, { mimeType: 'audio/webm;codecs=opus' });

        recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) {
            e.data.arrayBuffer().then(buf => {
              const bytes = new Uint8Array(buf);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              chrome.runtime.sendMessage({
                type: 'AUDIO_CHUNK',
                data: btoa(binary)
              });
            });
          }
        };

        recorder.onerror = e => {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_ERROR',
            error: e.error?.message || 'Recorder error'
          });
        };

        recorder.start(200);
        chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' });
      })
      .catch(err => {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_ERROR',
          error: err.message || 'Permission denied or tab not capturable'
        });
      });
  }

  startCapture();
})();
`;

async function startRecording(tabIds, sendResponse) {
  console.log('[BG] startRecording() entered, tabIds:', tabIds);
  try {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      sendResponse({ success: false, error: 'Already recording' });
      return;
    }

    recordingTabs = tabIds;
    audioChunks = [];

    // Inject content script into each tab
    let startedCount = 0;
    for (const tabId of tabIds) {
      try {
        const tab = await chrome.tabs.get(tabId);
        console.log('[BG] Tab', tabId, 'URL:', tab.url);
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
          console.log('[BG] Skipping tab', tabId, 'due to URL restriction');
          continue;
        }

        const result = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            const script = document.createElement('script');
            script.textContent = `
              (function() {
                let recorder = null;
                let stream = null;
                console.log('[Content] Script injected, requesting mic...');

                chrome.runtime.onMessage.addListener((msg) => {
                  if (msg.type === 'STOP_CAPTURE') {
                    if (recorder && recorder.state !== 'inactive') recorder.stop();
                    if (stream) stream.getTracks().forEach(t => t.stop());
                  }
                });

                navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                  .then(s => {
                    stream = s;
                    recorder = new MediaRecorder(s, { mimeType: 'audio/webm;codecs=opus' });
                    recorder.ondataavailable = e => {
                      if (e.data && e.data.size > 0) {
                        e.data.arrayBuffer().then(buf => {
                          const bytes = new Uint8Array(buf);
                          let binary = '';
                          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                          chrome.runtime.sendMessage({ type: 'AUDIO_CHUNK', data: btoa(binary) });
                        });
                      }
                    };
                    recorder.start(200);
                    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' });
                    recorder.onerror = e => chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: e.message });
                    console.log('[Content] Recording started in tab');
                  })
                  .catch(err => {
                    console.error('[Content] getUserMedia failed:', err.message);
                    chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: err.message || 'Permission denied or tab not capturable' });
                  });
              })();
            `;
            (document.head || document.documentElement).appendChild(script);
            script.remove();
          }
        });
        console.log('[BG] Script injected into tab', tabId, '— result:', result);
        startedCount++;
      } catch (e) {
        console.warn('[BG] Tab', tabId, 'injection error:', e.message);
      }
    }

    console.log('[BG] startedCount:', startedCount);
    if (startedCount === 0) {
      sendResponse({ success: false, error: 'Could not capture any tabs. Make sure the tab has audio playing.' });
      return;
    }

    // Track recording state in memory (no MediaRecorder in service worker)
    recordingTabs = tabIds;
    mediaRecorder = { state: 'recording' }; // marker object
    audioChunks = [];

    chrome.runtime.sendMessage({ type: 'RECORDING_STATE', state: 'recording', tabCount: startedCount });
    sendResponse({ success: true, tabCount: startedCount });
  } catch (err) {
    console.error('[BG] startRecording error:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}

async function stopRecording(sendResponse) {
  console.log('[BG] stopRecording() entered');
  try {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      sendResponse({ success: false, error: 'Not recording' });
      return;
    }

    mediaRecorder = null;

    // Stop all content script recorders
    for (const tabId of recordingTabs) {
      try {
        chrome.tabs.sendMessage(tabId, { type: 'STOP_CAPTURE' }).catch(() => {});
      } catch (e) { /* tab may be closed */ }
    }

    // Gather chunks
    const allBlobs = audioChunks;
    audioChunks = [];

    console.log('[BG] Blobs collected:', allBlobs.length);
    if (allBlobs.length === 0) {
      recordingTabs = [];
      sendResponse({ success: false, error: 'No audio recorded' });
      return;
    }

    // Concatenate all blobs into one
    const totalLen = 0; // compute as we go
    let allData = [];
    for (const blob of allBlobs) {
      const buf = await blob.arrayBuffer();
      allData.push(new Uint8Array(buf));
    }

    const totalBytes = allData.reduce((s, a) => s + a.length, 0);
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const arr of allData) {
      combined.set(arr, offset);
      offset += arr.length;
    }

    const finalBlob = new Blob([combined], { type: 'audio/webm' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const title = `Multi-tab Recording ${timestamp}`;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', finalBlob, 'recording.webm');

    const response = await fetch(`${API_BASE}/api/recordings/upload`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      chrome.runtime.sendMessage({
        type: 'RECORDING_COMPLETE',
        recordingId: result.id,
        title: title,
        tabCount: recordingTabs.length
      });
    } else {
      chrome.runtime.sendMessage({ type: 'UPLOAD_FAILED', error: `Upload failed: ${response.status}` });
    }

    recordingTabs = [];
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}