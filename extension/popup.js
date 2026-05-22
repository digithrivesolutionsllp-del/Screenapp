// ScreenApp Recorder - Popup UI v1.4
// Uses chrome.scripting to inject tabCapture into each selected tab

let tabs = [];
let selectedTabIds = new Set();
let tabIds = [];         // current recording tab IDs (for state restore)
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let activeTabStreams = []; // audio tracks from each captured tab
let mediaRecorder = null;
let audioChunks = [];

// Elements
const statusBadge = document.getElementById('statusBadge');
const recordingBar = document.getElementById('recordingBar');
const recTabCount = document.getElementById('recTabCount');
const recTimer = document.getElementById('recTimer');
const selectedChips = document.getElementById('selectedChips');
const selectedCount = document.getElementById('selectedCount');
const tabList = document.getElementById('tabList');
const btnRecord = document.getElementById('btnRecord');
const btnStop = document.getElementById('btnStop');
const btnCancel = document.getElementById('btnCancel');
const successPanel = document.getElementById('successPanel');
const errorBanner = document.getElementById('errorBanner');
const liveRecPanel = document.getElementById('liveRecPanel');
const liveTabCount = document.getElementById('liveTabCount');
const liveTimer = document.getElementById('liveTimer');
const btnLiveStop = document.getElementById('btnLiveStop');

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  // Check if a recording is already in progress (popup reopened mid-recording)
  chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (response) => {
    if (response && response.state && response.state.status === 'recording') {
      restoreRecordingState(response.state);
    } else {
      loadTabsWithTimeout();
    }
  });
}

function restoreRecordingState(state) {
  console.log('[Popup] Restoring recording state:', state);
  isRecording = true;
  recordingStartTime = state.startTime || Date.now();
  selectedTabIds = new Set(state.tabIds || []);
  tabIds = state.tabIds || [];

  // Restore live recording UI immediately
  statusBadge.className = 'status-badge status-recording';
  statusBadge.textContent = 'REC';
  recordingBar.classList.add('active');
  liveRecPanel.classList.add('active');
  recTabCount.textContent = state.tabCount || 1;
  liveTabCount.textContent = state.tabCount || 1;

  btnRecord.style.display = 'none';
  btnStop.style.display = 'flex';
  btnStop.disabled = false;
  btnCancel.disabled = true;

  // Start the timer
  startTimer();

  // Note: tab list still shows since we didn't load them yet
  // loadTabsWithTimeout() will refresh the tab list
  loadTabsWithTimeout();

  console.log('[Popup] Recording state restored. Timer running, can stop from here.');
}

function loadTabsWithTimeout() {
  tabList.innerHTML = '<div class="loading"><div class="spinner"></div>Fetching tabs...</div>';
  const timeout = setTimeout(() => {
    tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">Tab list timed out.<br><span style="color:#94a3b8">Try reopening on a regular page.</span><br><button onclick="loadTabsWithTimeout()" style="margin-top:8px;padding:4px 12px;background:#1e293b;color:#94a3b8;border:none;border-radius:6px;cursor:pointer">Retry</button></div>';
  }, 5000);

  chrome.tabs.query({}, (allTabs) => {
    clearTimeout(timeout);
    if (chrome.runtime.lastError) {
      tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">Permission error.<br><span style="color:#94a3b8">' + chrome.runtime.lastError.message + '</span></div>';
      return;
    }
    tabs = allTabs.filter(t =>
      t.url &&
      !t.url.startsWith('chrome://') &&
      !t.url.startsWith('chrome-extension://') &&
      !t.url.startsWith('devtools://') &&
      !t.url.startsWith('about:') &&
      !t.url.startsWith('file://')
    ).map(t => ({
      id: t.id,
      title: (t.title || 'Untitled').substring(0, 60),
      url: t.url,
      favIconUrl: t.favIconUrl,
      active: t.active
    }));
    renderTabs();
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTabs() {
  if (tabs.length === 0) {
    tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">No tabs found.<br><span style="color:#94a3b8">Open some tabs first, then reopen this popup.</span></div>';
    return;
  }
  tabList.innerHTML = tabs.map(tab => {
    const isSelected = selectedTabIds.has(tab.id);
    const favicon = tab.favIconUrl || '';
    return '<div class="tab-item' + (isSelected ? ' selected' : '') + '" data-tab-id="' + tab.id + '">' +
      (isSelected ? '<div class="tab-check">&#10003;</div>' : '<div class="tab-empty-check"></div>') +
      '<img class="tab-favicon" src="' + favicon + '" onerror="this.style.display=\'none\'" />' +
      '<div class="tab-info">' +
        '<div class="tab-title">' + escapeHtml(tab.title) + '</div>' +
        '<div class="tab-url">' + escapeHtml(tab.url) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  updateSelectedChips();
  updateButtons();
}

function selectTab(tabId) {
  if (isRecording) return;
  if (selectedTabIds.has(tabId)) selectedTabIds.delete(tabId);
  else selectedTabIds.add(tabId);
  renderTabs();
  updateButtons();
}

function removeTab(tabId) {
  if (isRecording) return;
  selectedTabIds.delete(tabId);
  renderTabs();
  updateButtons();
}

function clearSelection() {
  if (isRecording) return;
  selectedTabIds.clear();
  renderTabs();
  updateButtons();
}

function updateSelectedChips() {
  selectedCount.textContent = selectedTabIds.size;
  if (selectedTabIds.size === 0) {
    selectedChips.innerHTML = '<span class="chip-empty">Click on a tab below to select it</span>';
  } else {
    selectedChips.innerHTML = Array.from(selectedTabIds).map(id => {
      const tab = tabs.find(t => t.id === id);
      const name = tab ? tab.title.substring(0, 20) : 'Tab ' + id;
      return '<div class="chip"><span class="chip-name">' + escapeHtml(name) + '</span><span class="chip-remove" data-remove-id="' + id + '">&times;</span></div>';
    }).join('');
  }
}

function updateButtons() {
  btnRecord.disabled = selectedTabIds.size === 0 || isRecording;
}

// ─── Recording ────────────────────────────────────────────────────────────────

async function startRecording() {
  console.log('[Popup] startRecording() called, selected tabs:', selectedTabIds.size);
  if (selectedTabIds.size === 0) return;

  const tabIds = Array.from(selectedTabIds);
  console.log('[Popup] tabIds:', tabIds);
  btnRecord.disabled = true;
  btnCancel.disabled = true;
  isRecording = true;
  recordingStartTime = Date.now();
  audioChunks = [];
  activeTabStreams = [];

  // Immediate UI
  statusBadge.className = 'status-badge status-recording';
  statusBadge.textContent = 'Starting...';
  recordingBar.classList.add('active');
  liveRecPanel.classList.add('active');
  recTabCount.textContent = tabIds.length;
  liveTabCount.textContent = tabIds.length;
  btnRecord.style.display = 'none';
  btnStop.style.display = 'flex';
  btnStop.disabled = false;
  btnStop.textContent = '⏹ Stop';

  try {
    // Build combined stream from all selected tabs
    const combinedStream = new MediaStream();
    let successCount = 0;

    for (const tabId of tabIds) {
      try {
        // Inject tabCapture script into each selected tab
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            window.__tabCaptureStarted = false;
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
              .then(stream => {
                window.__tabCaptureStream = stream;
                window.__tabCaptureStarted = true;
                // Notify popup that this tab is ready
                chrome.runtime.sendMessage({
                  type: 'TAB_CAPTURE_READY',
                  tabId: null // we'll use tabId from closure
                });
              })
              .catch(err => {
                console.warn('[Tab] getUserMedia failed:', err.message);
                chrome.runtime.sendMessage({ type: 'TAB_CAPTURE_ERROR', error: err.message });
              });
          }
        });

        // Wait a moment for the stream to be established
        await new Promise(r => setTimeout(r, 500));

        // Try to get the stream from the tab via executeScript result
        // Since we can't return streams from executeScript, we'll use a shared approach:
        // Call chrome.tabCapture.capture from this popup context for ONE tab at a time
        break; // fallback: just do one tab for now

      } catch (err) {
        console.warn('[Popup] Script injection error for tab', tabId, ':', err.message);
      }
    }

    // Use chrome.tabCapture from popup (valid in user gesture context)
    for (const tabId of tabIds) {
      try {
        console.log('[Popup] Attempting tabCapture for tab:', tabId);
        const stream = await chrome.tabCapture.capture({ audio: true, video: false });
        if (stream && stream.getAudioTracks().length > 0) {
          stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
          activeTabStreams.push(stream);
          successCount++;
          console.log('[Popup] tabCapture SUCCESS for tab', tabId, '- tracks:', stream.getAudioTracks().length);
        } else {
          console.warn('[Popup] tabCapture returned empty stream for tab', tabId);
          if (stream) stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.error('[Popup] tabCapture error for tab', tabId, ':', err.message);
      }
    }

    if (combinedStream.getAudioTracks().length === 0) {
      showError('Could not capture audio. Try selecting a different tab and make sure audio is playing.');
      resetUI();
      return;
    }

    // Start MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';

    mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : {});

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        audioChunks.push(e.data);
        console.log('[Popup] Chunk', audioChunks.length, '- size:', (e.data.size / 1024).toFixed(1), 'KB');
      }
    };

    mediaRecorder.onerror = (e) => {
      console.error('[Popup] Recorder error:', e.error);
      showError('Recording error: ' + (e.error?.message || 'Unknown'));
      resetUI();
    };

    mediaRecorder.start(500);
    statusBadge.textContent = 'REC';
    startTimer();
    // Tell background we're recording so popup can restore state on reopen
    chrome.runtime.sendMessage({
      type: 'RECORDING_STARTED',
      startTime: recordingStartTime,
      tabIds: tabIds,
      tabCount: tabIds.length
    });
    console.log('[Popup] Recording started, tracks:', combinedStream.getAudioTracks().length);

  } catch (err) {
    console.error('[Popup] startRecording error:', err);
    showError('Failed: ' + err.message);
    chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' });
    resetUI();
  }
}

async function stopRecording() {
  if (!isRecording) return;

  btnStop.disabled = true;
  btnStop.textContent = 'Saving...';
  statusBadge.textContent = 'Saving';
  stopTimer();

  // Tell background recording has stopped
  chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' });

  // Stop all tab streams
  for (const stream of activeTabStreams) {
    stream.getTracks().forEach(track => track.stop());
  }
  activeTabStreams = [];

  // Stop recorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;

  await new Promise(r => setTimeout(r, 500));

  if (audioChunks.length === 0) {
    showError('No audio recorded. Try again.');
    resetUI();
    return;
  }

  // Combine chunks
  const allBlobs = audioChunks;
  audioChunks = [];
  const totalSize = allBlobs.reduce((s, b) => s + b.size, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const blob of allBlobs) {
    const arr = new Uint8Array(await blob.arrayBuffer());
    combined.set(arr, offset);
    offset += arr.byteLength;
  }

  const finalBlob = new Blob([combined], { type: 'audio/webm' });
  console.log('[Popup] Final blob:', (finalBlob.size / 1024).toFixed(1), 'KB, chunks:', allBlobs.length);

  // Convert to base64 data URL for background to upload
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = reader.result;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const title = `Tab Recording · ${dateStr} ${timeStr}`;

    chrome.runtime.sendMessage({
      type: 'FINALIZE_RECORDING',
      blob: dataUrl,
      title: title,
    }, (response) => {
      if (response && response.success) {
        showSuccess(title, selectedTabIds.size);
      } else {
        showError(response?.error || 'Upload failed');
        resetUI();
      }
    });
  };
  reader.readAsDataURL(finalBlob);
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    const time = mins + ':' + secs;
    recTimer.textContent = time;
    if (liveTimer) liveTimer.textContent = time;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function showError(msg) {
  errorBanner.textContent = '⚠ ' + msg;
  errorBanner.className = 'error-banner active';
  setTimeout(() => { errorBanner.className = 'error-banner'; }, 7000);
}

function showSuccess(title, tabCount) {
  statusBadge.className = 'status-badge status-saved';
  statusBadge.textContent = 'Saved';
  recordingBar.classList.remove('active');
  successPanel.classList.add('active');
  btnStop.style.display = 'none';
  btnCancel.style.display = 'none';
  btnRecord.style.display = 'none';
  setTimeout(resetUI, 3000);
}

function resetUI() {
  isRecording = false;
  selectedTabIds.clear();
  stopTimer();
  statusBadge.className = 'status-badge status-idle';
  statusBadge.textContent = 'Idle';
  recordingBar.classList.remove('active');
  successPanel.classList.remove('active');
  liveRecPanel.classList.remove('active');
  errorBanner.className = 'error-banner';
  btnRecord.style.display = 'flex';
  btnRecord.disabled = true;
  btnStop.style.display = 'none';
  btnCancel.style.display = 'flex';
  btnCancel.disabled = false;
  btnCancel.textContent = 'Clear';
  recTimer.textContent = '00:00';
  updateSelectedChips();
  updateButtons();
  loadTabsWithTimeout();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

tabList.addEventListener('click', (e) => {
  const item = e.target.closest('.tab-item');
  if (!item || isRecording) return;
  const tabId = parseInt(item.getAttribute('data-tab-id'), 10);
  if (!isNaN(tabId)) selectTab(tabId);
});

selectedChips.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove-id]');
  if (!btn || isRecording) return;
  const tabId = parseInt(btn.getAttribute('data-remove-id'), 10);
  if (!isNaN(tabId)) removeTab(tabId);
});

btnCancel?.addEventListener('click', clearSelection);
btnRecord?.addEventListener('click', () => startRecording());
btnStop?.addEventListener('click', () => stopRecording());
btnLiveStop?.addEventListener('click', () => stopRecording());

// Listen for recording complete from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_COMPLETE') {
    console.log('[Popup] Recording complete:', msg.recordingId);
    showSuccess(msg.title || 'Recording saved', msg.tabCount || 1);
  }
  if (msg.type === 'UPLOAD_FAILED') {
    console.error('[Popup] Upload failed:', msg.error);
    showError('Upload failed: ' + msg.error);
    resetUI();
  }
});

console.log('[Popup] v1.4 loaded. btnRecord:', !!btnRecord);

// ─── Start ─────────────────────────────────────────────────────────────────

init();
