// ScreenApp Recorder - Popup UI v1.3
// Handles tab capture and MediaRecorder directly (popup has full browser APIs)

let tabs = [];
let selectedTabIds = new Set();
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let tabStreams = [];      // MediaStream per captured tab
let mediaRecorder = null;  // single combined recorder
let audioChunks = [];      // ArrayBuffer chunks

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

// ─── Init ────────────────────────────────────────────────────────────────────

function init() {
  loadTabsWithTimeout();
}

function loadTabsWithTimeout() {
  tabList.innerHTML = '<div class="loading"><div class="spinner"></div>Fetching tabs...</div>';
  const timeout = setTimeout(() => {
    tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">Tab list timed out.<br><span style="color:#94a3b8">Try reopening on a regular page.</span><br><button onclick="window.loadTabsRetry && loadTabsWithTimeout()" style="margin-top:8px;padding:4px 12px;background:#1e293b;color:#94a3b8;border:none;border-radius:6px;cursor:pointer">Retry</button></div>';
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

// ─── Render ──────────────────────────────────────────────────────────────────

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
  if (selectedTabIds.has(tabId)) {
    selectedTabIds.delete(tabId);
  } else {
    selectedTabIds.add(tabId);
  }
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
      return '<div class="chip">' +
        '<span class="chip-name">' + escapeHtml(name) + '</span>' +
        '<span class="chip-remove" data-remove-id="' + id + '">&times;</span>' +
      '</div>';
    }).join('');
  }
}

function updateButtons() {
  btnRecord.disabled = selectedTabIds.size === 0 || isRecording;
}

// ─── Recording ────────────────────────────────────────────────────────────────

async function startRecording() {
  if (selectedTabIds.size === 0) return;

  const tabIds = Array.from(selectedTabIds);
  btnRecord.disabled = true;
  btnCancel.disabled = true;
  isRecording = true;
  recordingStartTime = Date.now();
  audioChunks = [];
  tabStreams = [];

  // Immediate UI feedback
  statusBadge.className = 'status-badge status-recording';
  statusBadge.textContent = 'Starting...';
  recordingBar.classList.add('active');
  recTabCount.textContent = tabIds.length;
  btnRecord.style.display = 'none';
  btnStop.style.display = 'flex';
  btnStop.disabled = false;
  btnStop.textContent = '⏹ Stop';

  try {
    // Capture each selected tab using chrome.tabCapture
    // This MUST be called with a user gesture (the Record button click counts)
    const combinedStream = new MediaStream();

    for (const tabId of tabIds) {
      try {
        const stream = await chrome.tabCapture.capture({ audio: true, video: false });
        if (stream) {
          const tracks = stream.getAudioTracks();
          console.log('[Popup] Captured tab', tabId, '— tracks:', tracks.length);
          tracks.forEach(track => combinedStream.addTrack(track));
          tabStreams.push(stream);
        } else {
          console.warn('[Popup] tabCapture returned null for tab', tabId);
        }
      } catch (err) {
        console.warn('[Popup] tabCapture error for tab', tabId, ':', err.message);
      }
    }

    if (combinedStream.getAudioTracks().length === 0) {
      showError('Could not capture audio from any selected tab. Make sure audio is playing in the tab.');
      resetUI();
      return;
    }

    // Record from the combined stream
    mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        e.data.arrayBuffer().then(buf => {
          audioChunks.push(buf);
          console.log('[Popup] Chunk', audioChunks.length, '— size:', (e.data.size / 1024).toFixed(1), 'KB');
        });
      }
    };

    mediaRecorder.onerror = (e) => {
      console.error('[Popup] MediaRecorder error:', e.error);
      showError('Recording error: ' + (e.error?.message || 'Unknown error'));
      resetUI();
    };

    mediaRecorder.start(500); // collect every 500ms
    statusBadge.textContent = 'REC';
    startTimer();
    console.log('[Popup] Recording started, active tracks:', combinedStream.getAudioTracks().length);

  } catch (err) {
    console.error('[Popup] startRecording error:', err.message);
    showError('Failed to start recording: ' + err.message);
    resetUI();
  }
}

async function stopRecording() {
  if (!isRecording) return;

  btnStop.disabled = true;
  btnStop.textContent = 'Saving...';
  statusBadge.textContent = 'Saving';
  stopTimer();

  // Stop all captured tab streams
  for (const stream of tabStreams) {
    stream.getAudioTracks().forEach(track => track.stop());
  }
  tabStreams = [];

  // Stop the recorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;

  // Wait briefly for final chunk
  await new Promise(r => setTimeout(r, 300));

  console.log('[Popup] Total chunks:', audioChunks.length);
  if (audioChunks.length === 0) {
    showError('No audio recorded. Try again.');
    resetUI();
    return;
  }

  // Combine all chunks
  const totalSize = audioChunks.reduce((s, buf) => s + buf.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const buf of audioChunks) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  const blob = new Blob([combined], { type: 'audio/webm' });
  const blobUrl = URL.createObjectURL(blob);
  console.log('[Popup] Final blob:', (blob.size / 1024).toFixed(1), 'KB');

  // Convert to data URL for transfer to background (service worker can't access blob URL)
  const reader = new FileReader();
  reader.onloadend = async () => {
    const dataUrl = reader.result;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const title = `Tab Recording ${timestamp}`;

    // Send to background for upload
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
  reader.readAsDataURL(blob);
}

// ─── UI Helpers ────────────────────────────────────────────────────────────────

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    recTimer.textContent = mins + ':' + secs;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function showError(msg) {
  errorBanner.textContent = '⚠ ' + msg;
  errorBanner.className = 'error-banner active';
  setTimeout(() => { errorBanner.className = 'error-banner'; }, 6000);
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
btnRecord?.addEventListener('click', startRecording);
btnStop?.addEventListener('click', stopRecording);

// ─── Start ──────────────────────────────────────────────────────────────────

init();
