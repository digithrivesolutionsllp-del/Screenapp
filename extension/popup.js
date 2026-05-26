// ScreenApp Recorder - Popup UI v16.1
// Fixes: (1) multiTabPanel→tabListPanel (2) picker cancel guard (3) stream cleanup (4) proper pending counter
// IMPORTANT: Keep popup OPEN from Record to Stop. Closing mid-recording loses chunks.

console.log('[Popup] popup.js v16.1 loaded');

const API_BASE = 'https://screenapp-production-e5c2.up.railway.app';
var _successShown = false;

// ─── State ───────────────────────────────────────────────────────────────────

// [{mediaRecorder, chunks, tabTitle, stream, tabId}]
window._recorders = [];
window._isRecording = false;
window._recordingStartTime = null;
window._activeStreams = [];
window._tabList = [];  // [{label, tabId}] for display

// ─── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  var btnRecord = document.getElementById('btnRecord');
  if (!btnRecord) { console.error('[Popup] btnRecord NOT FOUND'); return; }

  updateSteps(1);
  console.log('[Popup] v16.1 init');

  // Add Tab button in tab list panel (inline onclick in HTML handles it too)
  var btnAddTabPanel = document.getElementById('btnAddTabPanel');
  if (btnAddTabPanel) {
    btnAddTabPanel.addEventListener('click', function() {
      if (window._isRecording) startRecording();
    });
  }

  btnRecord.addEventListener('click', function() {
    if (window._isRecording) { stopRecording(); return; }
    startRecording();
  });

  var btnStop = document.getElementById('btnStop');
  var btnLiveStop = document.getElementById('btnLiveStop');
  if (btnStop) btnStop.addEventListener('click', stopRecording);
  if (btnLiveStop) btnLiveStop.addEventListener('click', stopRecording);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'F9' && window._isRecording) { e.preventDefault(); stopRecording(); }
  });

  console.log('[Popup] v16.1 listeners attached');
});

// ─── Start Recording ─────────────────────────────────────────────────────────

function startRecording() {
  console.log('[Popup] startRecording(), tabs:', window._recorders.length);

  // Use chrome.desktopCapture via background script — supports proper picker
  chrome.runtime.sendMessage({ type: 'GET_MEDIA', constraints: { audio: true, video: false } }, function(response) {
    if (response && response.streamId) {
      // User picked a source — get the stream
      navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: response.streamId } }
      }).then(handleStream).catch(function(err) {
        console.error('[Popup] getUserMedia from streamId failed:', err.name, err.message);
        showError('Failed to capture audio. Please try again.');
      });
    } else if (response && response.cancelled) {
      // User cancelled the picker — stop here, do NOT auto-open another picker
      console.log('[Popup] Picker cancelled by user — recording not started');
    } else {
      // Background not available — use direct getDisplayMedia
      fallbackGetDisplayMedia();
    }
  });

  // Timeout: if background doesn't respond in 1.5s, use direct fallback
  setTimeout(function() {
    if (!window._isRecording && window._recorders.length === 0) {
      console.log('[Popup] Background timeout, using direct getDisplayMedia');
      fallbackGetDisplayMedia();
    }
  }, 1500);
}

function fallbackGetDisplayMedia() {
  console.log('[Popup] fallbackGetDisplayMedia()');
  navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
    .then(handleStream)
    .catch(function(err) {
      console.error('[Popup] getDisplayMedia error:', err.name, err.message);
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        showError('Error: ' + (err.message || err.name));
      } else {
        console.log('[Popup] Picker cancelled — no action taken');
      }
    });
}

// ─── Handle Stream ────────────────────────────────────────────────────────────

function handleStream(stream) {
  console.log('[Popup] handleStream()');

  // Stop any video tracks — audio only
  stream.getVideoTracks().forEach(function(t) { t.stop(); stream.removeTrack(t); });

  var audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    // Clean up the stream before returning
    stream.getTracks().forEach(function(t) { t.stop(); });
    showError('No audio captured. CHECK "Share tab audio" in the picker, then Share.');
    return;
  }

  var tabLabel = audioTracks[0].label.replace(/^Tab:\s*/i, '').trim() || 'Tab ' + (window._recorders.length + 1);
  var tabId = 'tab-' + Date.now();
  console.log('[Popup] Tab label:', tabLabel);

  // First tab: initialise recording state
  if (window._recorders.length === 0) {
    _successShown = false;
    window._recordingStartTime = Date.now();
    window._isRecording = true;
    window._tabList = [];

    chrome.runtime.sendMessage({ type: 'SET_BADGE', text: 'REC' });

    fetch(API_BASE + '/api/recordings/live-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        title: 'Tab Recording',
        tab_count: '1',
        start_time: String(window._recordingStartTime)
      })
    }).catch(function() {});
  }

  var mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';

  var chunks = [];
  var mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : {});

  mediaRecorder.ondataavailable = function(e) {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
      if (chunks.length === 1) {
        console.log('[Popup] FIRST CHUNK for', tabLabel, 'size:', e.data.size);
      }
    }
  };

  mediaRecorder.onerror = function(e) {
    console.error('[Popup] MediaRecorder ERROR for', tabLabel, ':', e.error ? e.error.message : 'Unknown');
    showError('Recording error for ' + tabLabel + ': ' + (e.error ? e.error.message : 'Unknown'));
    removeTab(tabId);
  };

  mediaRecorder.onstop = function() {
    var totalSize = chunks.reduce(function(s, c) { return s + (c.size || 0); }, 0);
    console.log('[Popup] onstop for', tabLabel, '— chunks:', chunks.length, 'size:', totalSize);
    if (chunks.length === 0 || totalSize < 5000) {
      showError('No audio captured for ' + tabLabel + '. Did you CHECK "Share tab audio"?');
      onTabStopped(tabId);
      return;
    }
    directUpload(chunks, tabLabel, function() { onTabStopped(tabId); });
  };

  mediaRecorder.start(500);
  console.log('[Popup] MediaRecorder started for', tabLabel, 'state:', mediaRecorder.state);

  window._recorders.push({ mediaRecorder: mediaRecorder, chunks: chunks, tabTitle: tabLabel, stream: stream, tabId: tabId });
  window._activeStreams.push(stream);
  window._tabList.push({ label: tabLabel, tabId: tabId });

  fetch(API_BASE + '/api/recordings/live-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      title: window._recorders.length + ' tab(s)',
      tab_count: String(window._recorders.length),
      start_time: String(window._recordingStartTime)
    })
  }).catch(function() {});

  updateRecordingUI();
  startTimer();
  console.log('[Popup] Total tabs recording:', window._recorders.length);
}

// ─── Remove a single tab from recording ─────────────────────────────────────

function removeTab(tabId) {
  var rec = window._recorders.find(function(r) { return r.tabId === tabId; });
  if (rec) {
    try { rec.stream.getTracks().forEach(function(t) { t.stop(); }); } catch(e) {}
    window._activeStreams = window._activeStreams.filter(function(s) { return s !== rec.stream; });
    window._tabList = window._tabList.filter(function(t) { return t.tabId !== tabId; });
    window._recorders = window._recorders.filter(function(r) { return r.tabId !== tabId; });
  }
  if (window._recorders.length === 0) {
    _successShown = true;
    resetUI();
  } else {
    updateRecordingUI();
    fetch(API_BASE + '/api/recordings/live-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        title: window._recorders.length + ' tab(s)',
        tab_count: String(window._recorders.length),
        start_time: String(window._recordingStartTime)
      })
    }).catch(function() {});
  }
}

// ─── Stop a single tab ──────────────────────────────────────────────────────

window.stopTab = function(tabId) {
  console.log('[Popup] stopTab()', tabId);
  var rec = window._recorders.find(function(r) { return r.tabId === tabId; });
  if (rec && rec.mediaRecorder.state !== 'inactive') {
    rec.mediaRecorder.stop();
  }
};

// ─── Called when all tab recorders finish ─────────────────────────────────────

function onTabStopped(triggerTabId) {
  var allInactive = window._recorders.every(function(rec) {
    return !rec.mediaRecorder || rec.mediaRecorder.state === 'inactive';
  });
  if (!allInactive) return;
  if (_successShown) return;
  _successShown = true;

  var statusBadge = document.getElementById('statusBadge');
  var recordingBar = document.getElementById('recordingBar');
  var liveRecPanel = document.getElementById('liveRecPanel');
  var successPanel = document.getElementById('successPanel');
  var btnStop = document.getElementById('btnStop');
  var btnRecordEl = document.getElementById('btnRecord');

  if (statusBadge) { statusBadge.className = 'status-badge status-saved'; statusBadge.textContent = 'Saved'; }
  if (recordingBar) recordingBar.classList.remove('active');
  if (liveRecPanel) liveRecPanel.classList.remove('active');
  if (successPanel) successPanel.classList.add('active');
  if (btnStop) btnStop.style.display = 'none';
  if (btnRecordEl) { btnRecordEl.style.display = 'flex'; btnRecordEl.disabled = false; btnRecordEl.textContent = 'Record Tab Audio'; }

  window._isRecording = false;
  window._recordingStartTime = null;
  stopTimer();

  chrome.runtime.sendMessage({ type: 'CLEAR_BADGE' });
  fetch(API_BASE + '/api/recordings/live-state', { method: 'DELETE' }).catch(function() {});

  console.log('[Popup] All recordings saved!');
  setTimeout(resetUI, 8000);
}

// ─── UI: Update recording state ──────────────────────────────────────────────

function updateRecordingUI() {
  var tabCount = window._recorders.length;
  var statusBadge = document.getElementById('statusBadge');
  var recordingBar = document.getElementById('recordingBar');
  var liveRecPanel = document.getElementById('liveRecPanel');
  var instructions = document.getElementById('instructionsPanel');
  var btnStop = document.getElementById('btnStop');
  var btnRecordEl = document.getElementById('btnRecord');
  var tabListPanel = document.getElementById('tabListPanel');
  var tabList = document.getElementById('tabList');
  var btnAddTabPanel = document.getElementById('btnAddTabPanel');

  var badgeText = tabCount === 0 ? 'Idle' : (tabCount === 1 ? 'REC' : 'REC x' + tabCount);
  var btnText = tabCount === 0 ? 'Record Tab Audio' : 'Stop All';

  if (statusBadge) {
    statusBadge.textContent = badgeText;
    statusBadge.className = 'status-badge ' + (tabCount === 0 ? 'status-idle' : 'status-recording');
  }

  if (tabCount > 0) {
    if (recordingBar) recordingBar.classList.add('active');
    if (liveRecPanel) liveRecPanel.classList.add('active');
    if (instructions) instructions.style.display = 'none';
    if (btnStop) { btnStop.style.display = 'flex'; btnStop.disabled = false; }
    if (btnRecordEl) { btnRecordEl.style.display = 'flex'; btnRecordEl.disabled = false; btnRecordEl.textContent = btnText; }

    // Show tab list panel with all recorded tabs
    if (tabListPanel) { tabListPanel.classList.add('active'); }
    if (tabList) {
      var html = '';
      window._tabList.forEach(function(t) {
        html += '<div class="tab-item">' +
          '<span class="tab-dot"></span>' +
          '<span class="tab-label">' + escHtml(t.label) + '</span>' +
          '<button class="btn-remove-tab" onclick="stopTab(\'' + t.tabId + '\')">&#10005;</button>' +
          '</div>';
      });
      tabList.innerHTML = html;
    }

    updateSteps(4);
  } else {
    if (tabListPanel) tabListPanel.classList.remove('active');
  }
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Timer ───────────────────────────────────────────────────────────────────

var _timerInterval = null;

function startTimer() {
  stopTimer();
  _timerInterval = setInterval(function() {
    if (!window._recordingStartTime) return;
    var elapsed = Math.floor((Date.now() - window._recordingStartTime) / 1000);
    var m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    var s = String(elapsed % 60).padStart(2, '0');
    var recTimer = document.getElementById('recTimer');
    var liveTimer = document.getElementById('liveTimer');
    if (recTimer) recTimer.textContent = m + ':' + s;
    if (liveTimer) liveTimer.textContent = m + ':' + s;
  }, 1000);
}

function stopTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

// ─── Stop Recording (all tabs) ──────────────────────────────────────────────

function stopRecording() {
  console.log('[Popup] stopRecording() — tabs:', window._recorders.length);
  stopTimer();
  _successShown = true;

  var btnStop = document.getElementById('btnStop');
  var statusBadge = document.getElementById('statusBadge');
  var btnRecordEl = document.getElementById('btnRecord');
  if (btnStop) { btnStop.disabled = true; btnStop.textContent = 'Processing...'; }
  if (statusBadge) { statusBadge.textContent = 'Processing'; statusBadge.className = 'status-badge status-saving'; }
  if (btnRecordEl) { btnRecordEl.style.display = 'none'; btnRecordEl.disabled = true; }

  // Stop all stream tracks immediately
  window._activeStreams.forEach(function(s) {
    s.getTracks().forEach(function(t) { try { t.stop(); } catch(e) {} });
  });
  window._activeStreams = [];

  if (window._recorders.length === 0) { resetUI(); return; }

  chrome.runtime.sendMessage({ type: 'CLEAR_BADGE' });

  // Stop all MediaRecorders — track pending count properly
  var pending = window._recorders.length;
  var checkDone = function() {
    pending--;
    if (pending <= 0) {
      // Wait a moment for onstop handlers to finish before showing success
      setTimeout(function() { onTabStopped(null); }, 500);
    }
  };

  window._recorders.forEach(function(rec) {
    if (rec.mediaRecorder.state !== 'inactive') {
      rec.mediaRecorder.onstop = function() {
        var totalSize = rec.chunks.reduce(function(s, c) { return s + (c.size || 0); }, 0);
        if (rec.chunks.length === 0 || totalSize < 5000) {
          showError('No audio for ' + rec.tabTitle + '.');
          checkDone();
          return;
        }
        directUpload(rec.chunks, rec.tabTitle, checkDone);
      };
      rec.mediaRecorder.stop();
    } else {
      var totalSize = (rec.chunks || []).reduce(function(s, c) { return s + (c.size || 0); }, 0);
      if ((rec.chunks || []).length > 0 && totalSize >= 5000) {
        directUpload(rec.chunks, rec.tabTitle, checkDone);
      } else {
        checkDone();
      }
    }
  });
}

// ─── Direct Upload ───────────────────────────────────────────────────────────

function directUpload(chunks, tabTitle, callback) {
  console.log('[Popup] directUpload() — chunks:', chunks.length, 'tab:', tabTitle);

  async function doUpload() {
    try {
      var totalSize = 0;
      for (var k = 0; k < chunks.length; k++) totalSize += chunks[k].size;
      console.log('[Popup] Total size:', totalSize, 'bytes');

      if (totalSize < 5000) {
        showError('Recording too short for ' + tabTitle + ' (' + totalSize + ' bytes).');
        if (callback) callback();
        return;
      }

      var combined = new Uint8Array(totalSize);
      var offset = 0;
      for (var m = 0; m < chunks.length; m++) {
        var ab = await chunks[m].arrayBuffer();
        combined.set(new Uint8Array(ab), offset);
        offset += ab.byteLength;
      }

      var blob = new Blob([combined.slice(0, offset)], { type: 'audio/webm' });
      console.log('[Popup] Blob ready, size:', blob.size, 'bytes');

      var duration = window._recordingStartTime ? Math.floor((Date.now() - window._recordingStartTime) / 1000) : 0;
      var formData = new FormData();
      formData.append('title', tabTitle || 'Tab Recording');
      formData.append('file', blob, 'recording.webm');
      formData.append('duration', String(duration));

      var response = await fetch(API_BASE + '/api/recordings/upload', { method: 'POST', body: formData });

      if (response.ok) {
        var result = await response.json();
        console.log('[Popup] Uploaded, ID:', result.id, 'title:', tabTitle);
      } else {
        var text = await response.text();
        console.error('[Popup] Upload failed:', response.status, text);
        showError('Upload failed for ' + tabTitle + ' (' + response.status + ')');
      }
    } catch(err) {
      console.error('[Popup] Upload error:', err.name, err.message);
      showError('Upload error: ' + (err.name || err.message));
    }
    if (callback) callback();
  }

  doUpload();
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────

function showError(msg) {
  console.error('[Popup] showError:', msg);
  var banner = document.getElementById('errorBanner');
  if (banner) { banner.textContent = msg; banner.className = 'error-banner active'; }
  setTimeout(function() {
    var b = document.getElementById('errorBanner');
    if (b) b.className = 'error-banner';
  }, 5000);
}

function resetUI() {
  console.log('[Popup] resetUI()');
  _successShown = false;
  window._isRecording = false;
  window._recordingStartTime = null;
  window._recorders = [];
  window._activeStreams = [];
  window._tabList = [];
  stopTimer();

  var statusBadge = document.getElementById('statusBadge');
  var recordingBar = document.getElementById('recordingBar');
  var liveRecPanel = document.getElementById('liveRecPanel');
  var instructions = document.getElementById('instructionsPanel');
  var btnRecordEl = document.getElementById('btnRecord');
  var btnStop = document.getElementById('btnStop');
  var successPanel = document.getElementById('successPanel');
  var errorBanner = document.getElementById('errorBanner');
  var recTimer = document.getElementById('recTimer');
  var liveTimer = document.getElementById('liveTimer');
  var tabListPanel = document.getElementById('tabListPanel');

  if (statusBadge) { statusBadge.className = 'status-badge status-idle'; statusBadge.textContent = 'Idle'; }
  if (recordingBar) recordingBar.classList.remove('active');
  if (liveRecPanel) liveRecPanel.classList.remove('active');
  if (instructions) instructions.style.display = 'block';
  if (btnRecordEl) { btnRecordEl.style.display = 'flex'; btnRecordEl.disabled = false; btnRecordEl.textContent = 'Record Tab Audio'; }
  if (btnStop) { btnStop.style.display = 'none'; btnStop.disabled = false; btnStop.textContent = 'Stop All'; }
  if (successPanel) successPanel.classList.remove('active');
  if (errorBanner) errorBanner.className = 'error-banner';
  if (recTimer) recTimer.textContent = '00:00';
  if (liveTimer) liveTimer.textContent = '00:00';
  if (tabListPanel) tabListPanel.classList.remove('active');
  updateSteps(1);
}

function updateSteps(currentStep) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('step' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < currentStep) el.classList.add('done');
    else if (i === currentStep) el.classList.add('active');
  }
}