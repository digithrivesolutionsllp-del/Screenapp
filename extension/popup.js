// ScreenApp Recorder - Popup UI Logic

let tabs = [];
let selectedTabIds = new Set();
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;

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

// Load tabs immediately — with timeout so we never hang
function init() {
  loadTabsWithTimeout();
  checkStatus();
}

function loadTabsWithTimeout() {
  tabList.innerHTML = '<div class="loading"><div class="spinner"></div>Fetching tabs...</div>';

  const timeout = setTimeout(() => {
    tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">Tab list timed out.<br><span style="color:#94a3b8">Try reopening on a regular page.</span><br><button onclick="loadTabsWithTimeout()" style="margin-top:8px;padding:4px 12px;background:#1e293b;color:#94a3b8;border:none;border-radius:6px;cursor:pointer">Retry</button></div>';
  }, 5000);

  chrome.tabs.query({}, (allTabs) => {
    clearTimeout(timeout);
    if (chrome.runtime.lastError) {
      tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">Permission error.<br><span style="color:#94a3b8">' + chrome.runtime.lastError.message + '</span><br><button onclick="loadTabsWithTimeout()" style="margin-top:8px;padding:4px 12px;background:#1e293b;color:#94a3b8;border:none;border-radius:6px;cursor:pointer">Retry</button></div>';
      return;
    }
    tabs = allTabs.filter(t =>
      t.url &&
      !t.url.startsWith('chrome://') &&
      !t.url.startsWith('chrome-extension://') &&
      !t.url.startsWith('devtools://') &&
      !t.url.startsWith('about:') &&
      !t.url.startsWith('file://') &&
      t.url !== ''
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

function loadTabs() {
  loadTabsWithTimeout();
}

function checkStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.recording) {
      isRecording = true;
      selectedTabIds = new Set(response.tabs || []);
      recordingStartTime = Date.now();
      startTimer();
      updateRecordingUI('recording', selectedTabIds.size);
    }
  });
}

function renderTabs() {
  if (tabs.length === 0) {
    tabList.innerHTML = '<div style="padding:20px;color:#6b7280;font-size:12px;text-align:center">No tabs found.<br><span style="color:#94a3b8">Open some tabs first, then reopen this popup.</span></div>';
    return;
  }

  tabList.innerHTML = tabs.map(tab => {
    const isSelected = selectedTabIds.has(tab.id);
    const favicon = tab.favIconUrl || '';
    return '<div class="tab-item' + (isSelected ? ' selected' : '') + '" onclick="selectTab(' + tab.id + ')">' +
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
        '<span class="chip-remove" onclick="event.stopPropagation();removeTab(' + id + ')">&times;</span>' +
      '</div>';
    }).join('');
  }
}

function clearSelection() {
  if (isRecording) return;
  selectedTabIds.clear();
  renderTabs();
  updateButtons();
}

function updateButtons() {
  btnRecord.disabled = selectedTabIds.size === 0 || isRecording;
}

function startRecording() {
  if (selectedTabIds.size === 0) return;
  btnRecord.disabled = true;
  btnCancel.disabled = true;
  isRecording = true;
  recordingStartTime = Date.now();

  chrome.runtime.sendMessage({
    type: 'START_RECORDING',
    tabIds: Array.from(selectedTabIds)
  }, (response) => {
    if (response && response.success) {
      updateRecordingUI('recording', response.tabCount || selectedTabIds.size);
      startTimer();
    } else {
      showError((response && response.error) || 'Could not start recording');
      resetUI();
    }
  });
}

function stopRecording() {
  btnStop.disabled = true;
  btnStop.textContent = 'Saving...';
  isRecording = false;
  stopTimer();

  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
    if (!response || !response.success) {
      showError((response && response.error) || 'Could not stop recording');
    }
    updateRecordingUI('saving', selectedTabIds.size);
  });
}

function updateRecordingUI(state, tabCount) {
  if (state === 'recording') {
    statusBadge.className = 'status-badge status-recording';
    statusBadge.textContent = 'REC';
    recordingBar.classList.add('active');
    recTabCount.textContent = tabCount;
    btnRecord.style.display = 'none';
    btnStop.style.display = 'flex';
    btnStop.disabled = false;
    btnStop.textContent = '⏹ Stop';
  } else if (state === 'saving') {
    statusBadge.className = 'status-badge status-saving';
    statusBadge.textContent = 'Saving';
    btnStop.textContent = 'Saving...';
  }
}

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
  setTimeout(() => { errorBanner.className = 'error-banner'; }, 5000);
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
  btnCancel.innerHTML = 'Clear';
  recTimer.textContent = '00:00';
  updateSelectedChips();
  updateButtons();
  loadTabs();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Message listener
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_STATE') updateRecordingUI('recording', msg.tabCount);
  if (msg.type === 'RECORDING_COMPLETE') showSuccess(msg.title, msg.tabCount);
  if (msg.type === 'TAB_CAPTURE_ERROR') showError(msg.error || 'Cannot capture tab');
  if (msg.type === 'RECORDING_ERROR') showError('Error: ' + (msg.error || 'unknown'));
  if (msg.type === 'UPLOAD_FAILED') showError('Upload failed: ' + (msg.error || ''));
});

// Start
init();