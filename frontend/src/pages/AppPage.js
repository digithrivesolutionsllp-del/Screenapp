import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AudioWaveform, Home, Folder, Star, Plus, Search, Settings,
  Mic, Square, Pause, Play, Volume2, Download, Share2,
  ChevronRight, Send, Clock, MoreHorizontal, X, FileText,
  CheckSquare, MessageSquare, Upload, ArrowLeft, Trash2
} from 'lucide-react';
import { uploadRecording as apiUploadRecording, getRecordings as apiGetRecordings, transcribeRecording as apiTranscribeRecording, summarizeRecording as apiSummarizeRecording, chatWithRecording as apiChatWithRecording, getFolders, createFolder, renameFolder, deleteFolder, updateRecording } from '../lib/api';

const BRAND_BLUE = '#4175F5';
const SPEAKER_COLORS = {
  John: 'text-blue-500', Sarah: 'text-violet-500', Mike: 'text-emerald-500',
  Client: 'text-orange-500', You: 'text-rose-500'
};
const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
    }
  } catch {
    return dateStr;
  }
};

// --- Real Waveform Component ---
const RecordingWaveform = ({ isActive, liveHeights }) => {
  const [animHeights, setAnimHeights] = useState(Array(28).fill(20));
  useEffect(() => {
    if (!isActive || liveHeights) return;
    const id = setInterval(() => setAnimHeights(Array(28).fill(0).map(() => Math.random() * 56 + 8)), 150);
    return () => clearInterval(id);
  }, [isActive, liveHeights]);
  const bars = liveHeights || animHeights;
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((h, i) => (
        <div key={i} className="w-1.5 rounded-full"
          style={{ height: h, background: isActive ? BRAND_BLUE : '#E5E7EB', transition: liveHeights ? 'none' : 'height 0.12s ease' }} />
      ))}
    </div>
  );
};

// --- Chrome Extension Modal with real tab audio ---
const ChromeExtModal = ({ onClose, onSave }) => {
  const [toggles, setToggles] = useState({ mic: true, tabAudio: false, autoTranscribe: true });
  const [isRec, setIsRec] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(0);

  useEffect(() => {
    if (!isRec) return;
    const id = setInterval(() => { timerRef.current += 1; setRecTime(timerRef.current); }, 1000);
    return () => clearInterval(id);
  }, [isRec]);

  const toggle = (k) => setToggles(p => ({ ...p, [k]: !p[k] }));

  const startExtRec = async () => {
    try {
      let stream;
      if (toggles.tabAudio) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: {
            suppressLocalAudioPlayback: false,
          },
          selfBrowserSurface: 'exclude',
          preferCurrentTab: false,
          surfaceSwitching: 'include',
        });
        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach(t => t.stop());
          alert('No tab audio detected.\n\nIn the Chrome sharing dialog you must:\n1. Click the "Chrome Tab" section\n2. Select the tab playing audio (e.g. YouTube)\n3. Check "Share tab audio"\n4. Click Share\n\nTry again and follow the steps above.');
          return;
        }
        displayStream.getVideoTracks().forEach(t => t.stop());
        stream = new MediaStream(displayStream.getAudioTracks());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      streamRef.current = stream;
      chunksRef.current = [];
      timerRef.current = 0;
      setRecTime(0);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mrRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        onSave(blob, timerRef.current, toggles.tabAudio ? 'Tab Audio' : 'Microphone');
        streamRef.current?.getTracks().forEach(t => t.stop());
        onClose();
      };
      mr.start(100);
      setIsRec(true);
    } catch (err) {
      console.error('Extension recording failed:', err);
      if (err.name !== 'NotAllowedError') alert('Recording failed. Please check browser permissions and try again.');
    }
  };

  const stopExtRec = () => {
    if (mrRef.current?.state !== 'inactive') mrRef.current.stop();
    setIsRec(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-72 overflow-hidden pointer-events-auto">
        <div className="p-3 flex items-center justify-between" style={{ background: BRAND_BLUE }}>
          <div className="flex items-center gap-2">
            <AudioWaveform className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">ScreenApp</span>
            <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded">Extension</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors duration-150"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-4">Capture audio from this tab and transcribe with AI</p>
          <div className="space-y-3 mb-5">
            {[
              { key: 'mic', label: 'Microphone', desc: 'Your microphone input' },
              { key: 'tabAudio', label: 'Tab Audio', desc: 'Capture another tab (YouTube etc.)' },
              { key: 'autoTranscribe', label: 'Auto-transcribe', desc: 'Transcribe after recording' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
                <div onClick={() => toggle(key)}
                  className="w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer flex-shrink-0 ml-2 transition-colors duration-150"
                  style={{ background: toggles[key] ? BRAND_BLUE : '#D1D5DB' }}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-150 ${toggles[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            ))}
          </div>
          {isRec && (
            <div className="flex items-center justify-center gap-2 mb-3 text-sm text-red-500 font-semibold">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording {formatTime(recTime)}
              {toggles.tabAudio && <span className="text-xs text-gray-400 font-normal ml-1">• Tab audio</span>}
            </div>
          )}

          {toggles.tabAudio && !isRec && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                <span>📋</span> How to capture another tab's audio:
              </p>
              <ol className="space-y-1.5 text-xs text-blue-700">
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">1.</span> Open YouTube (or other tab) and start playing</li>
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">2.</span> Click <strong>"Start Recording"</strong> below</li>
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">3.</span> In Chrome dialog → click <strong>"Chrome Tab"</strong></li>
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">4.</span> Select the tab you want (e.g. YouTube)</li>
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">5.</span> ✓ Check <strong>"Share tab audio"</strong></li>
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">6.</span> Click <strong>Share</strong></li>
              </ol>
              <p className="text-xs text-blue-500 mt-2 italic">ScreenApp tab is hidden from the list automatically.</p>
            </div>
          )}

          {isRec ? (
            <button onClick={stopExtRec} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 transition-colors duration-150">
              <Square className="w-4 h-4 fill-white" /> Stop & Save
            </button>
          ) : (
            <button onClick={startExtRec} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity duration-150" style={{ background: BRAND_BLUE }}>
              <Mic className="w-4 h-4" /> Start Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AppPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState('dashboard');
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', content: 'Hi! I can answer questions about this recording. Try "What were the action items?" or "Give me a summary."' }]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [showExtension, setShowExtension] = useState(false);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('root');
  const [liveExtensionRecording, setLiveExtensionRecording] = useState(null); // { startTime, tabCount, title }
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [renameRecordingId, setRenameRecordingId] = useState(null);
  const [renameRecordingTitle, setRenameRecordingTitle] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const fileInputRef = useRef(null);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(0);

  // Load recordings when folder changes
  useEffect(() => {
    const loadRecordings = async () => {
      setIsLoadingRecordings(true);
      try {
        const url = activeFolder === 'root'
          ? 'http://localhost:8000/api/recordings?folder_id='
          : activeFolder === 'all'
          ? 'http://localhost:8000/api/recordings?folder_id=all'
          : `http://localhost:8000/api/recordings?folder_id=${activeFolder}`;
        const response = await fetch(url);
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setRecordings(list.map(r => ({ ...r, id: r.id || r._id })));
      } catch (err) {
        console.error('Failed to load recordings:', err);
        setRecordings([]);
      } finally {
        setIsLoadingRecordings(false);
      }
    };
    loadRecordings();
  }, [activeFolder]);

  // Auto-refresh recordings + live recording state every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (view !== 'dashboard') return;
      try {
        const [liveRes, recRes] = await Promise.all([
          fetch('http://localhost:8000/api/recordings/live-state'),
          fetch('http://localhost:8000/api/recordings?folder_id=')
        ]);
        // Update live recording status
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          const live = liveData && liveData.recording ? liveData : null;
          setLiveExtensionRecording(prev => {
            if (live && !prev) return { startTime: live.start_time, tabCount: live.tab_count, title: live.title };
            if (!live && prev) return null;
            return prev; // keep existing state, timer will re-render automatically
          });
        }
        // Update recordings list
        if (recRes.ok) {
          const data = await recRes.json();
          const list = Array.isArray(data) ? data : [];
          const fresh = list.map(r => ({ ...r, id: r.id || r._id }));
          const existingIds = new Set(recordings.map(r => r.id));
          const newOnes = fresh.filter(r => !existingIds.has(r.id));
          if (newOnes.length > 0) setRecordings(fresh);
        }
      } catch (err) { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [view, recordings]);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const data = await getFolders();
        setFolders(data);
      } catch (err) { console.error('Failed to load folders:', err); }
    };
    loadFolders();
  }, []);

  // Auto-open extension if navigated with state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.state?.openExtension) setShowExtension(true);
  }, []);

  // Timer
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const id = setInterval(() => { timerRef.current += 1; setRecordingTime(timerRef.current); }, 1000);
    return () => clearInterval(id);
  }, [isRecording, isPaused]);

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close().catch(() => {});
  }, []);

  const startAnimLoop = (analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / 28));
      setLiveWaveform(Array.from({ length: 28 }, (_, i) => Math.max(4, (data[Math.min(i * step, data.length - 1)] / 255) * 60)));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startRealRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        startAnimLoop(analyser);
      } catch (e) { console.warn('Analyser setup failed, using fallback animation', e); }

      const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      timerRef.current = 0;

      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const filename = `recording_${Date.now()}.webm`;

        setRecordings(prev => [{
          id: `uploading_${Date.now()}`,
          title: `Recording – ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          date: 'Just now', duration: formatTime(timerRef.current), speakers: ['You'], audioUrl: URL.createObjectURL(blob), isUploading: true
        }, ...prev]);

        try {
          const serverData = await apiUploadRecording(blob, filename, timerRef.current, 'Microphone');
          const serverId = serverData?.id || serverData?._id || `rec_${Date.now()}`;
          setRecordings(prev => prev.map(r => (r.id || '').startsWith('uploading_') ? { ...r, ...serverData, id: serverId, audioUrl: URL.createObjectURL(blob), isUploading: false } : r));
          setSelectedRecording(prev => (prev?.id || '').startsWith('uploading_') ? { ...prev, ...serverData, id: serverId, audioUrl: URL.createObjectURL(blob), isUploading: false } : prev);
        } catch (err) {
          console.error('Upload failed, keeping local recording:', err);
          setRecordings(prev => prev.map(r => (r.id || '').startsWith('uploading_') ? { ...r, id: `local_${Date.now()}`, isUploading: false } : r));
        }

        setView('dashboard'); setRecordingTime(0); timerRef.current = 0;
        setLiveWaveform(null);
      };

      mr.start(100);
      setIsRecording(true); setIsPaused(false); setView('recorder');
    } catch (err) {
      console.error('Mic error:', err);
      alert('Microphone access denied.\n\nPlease allow microphone access when prompted by your browser to start recording.');
    }
  };

  const stopRealRecording = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close().catch(() => {});
    setIsRecording(false);
  };

  const togglePause = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause(); setIsPaused(true);
      cancelAnimationFrame(animFrameRef.current);
      setLiveWaveform(Array(28).fill(4));
    } else if (mr.state === 'paused') {
      mr.resume(); setIsPaused(false);
      if (analyserRef.current) startAnimLoop(analyserRef.current);
    }
  };

  const discardRecording = () => {
    cancelAnimationFrame(animFrameRef.current);
    mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current.stop();
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close().catch(() => {});
    audioChunksRef.current = [];
    setIsRecording(false); setView('dashboard');
    setRecordingTime(0); timerRef.current = 0; setLiveWaveform(null);
  };

  const openRecording = async (rec) => {
    const recId = rec.id || rec._id;
    const audioUrl = rec.audioUrl || `http://localhost:8000/api/recordings/${recId}/audio`;
    setSelectedRecording({ ...rec, audioUrl });
    setView('viewer');
    setActiveTab('transcript');
    setChatMessages([{ role: 'ai', content: 'Hi! I can answer questions about this recording. Try "What were the action items?" or "Give me a summary."' }]);
  };

  const isServerRecording = (recId) => recId && !String(recId).startsWith('local_') && !String(recId).startsWith('uploading_');

  const handleTabChange = async (newTab) => {
    setActiveTab(newTab);
    const recId = (selectedRecording?.id || selectedRecording?._id || '');

    if (newTab === 'transcript' && isServerRecording(recId)) {
      if (selectedRecording.transcript) return;
      setIsTranscribing(true);
      try {
        const data = await apiTranscribeRecording(recId);
        setSelectedRecording(prev => prev ? { ...prev, transcript: data.transcript || data, isTranscribed: true } : prev);
        setRecordings(prev => prev.map(r => (r.id === recId || r._id === recId) ? { ...r, transcript: data.transcript || data } : r));
      } catch (err) {
        console.error('Transcription failed:', err);
        alert('Transcription failed. Please check that the backend is running and try again.');
      } finally {
        setIsTranscribing(false);
      }
    }

    if (newTab === 'summary' && isServerRecording(recId)) {
      if (selectedRecording.summary) return;
      setIsSummarizing(true);
      try {
        const data = await apiSummarizeRecording(recId);
        setSelectedRecording(prev => prev ? { ...prev, summary: data.summary || data, isSummarized: true } : prev);
        setRecordings(prev => prev.map(r => (r.id === recId || r._id === recId) ? { ...r, summary: data.summary || data } : r));
      } catch (err) {
        console.error('Summarization failed:', err);
        alert('Summarization failed. Please check that the backend is running and try again.');
      } finally {
        setIsSummarizing(false);
      }
    }
  };

  const sendChat = async () => {
    const chatRecId = selectedRecording?.id || selectedRecording?._id;
    if (!chatInput.trim() || !chatRecId || String(chatRecId).startsWith('local_')) {
      // Fallback for local recordings that haven't been uploaded
      if (!chatInput.trim()) return;
      const msg = chatInput.trim();
      setChatInput('');
      setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
      setIsAITyping(true);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'ai', content: 'This recording is stored locally and cannot be chatted with yet. Please upload it to the server first.' }]);
        setIsAITyping(false);
      }, 500);
      return;
    }

    const msg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMessages);
    setIsAITyping(true);
    try {
      const reply = await apiChatWithRecording(chatRecId, msg, chatMessages);
      setChatMessages(prev => [...prev, { role: 'ai', content: reply.response || reply.message || reply }]);
    } catch (err) {
      console.error('Chat failed:', err);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I could not get a response. Please check that the backend is running.' }]);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleExtSave = async (blob, duration, source) => {
    setIsUploading(true);
    try {
      const filename = `${source}_${Date.now()}.webm`;
      const data = await apiUploadRecording(blob, filename, duration, source);
      const newRecording = {
        id: data.id || `uploaded_${Date.now()}`,
        title: `${source} – ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        date: 'Just now',
        duration: formatTime(duration),
        speakers: ['You'],
        audioUrl: data.audioUrl || URL.createObjectURL(blob),
      };
      setRecordings(prev => [newRecording, ...prev]);
    } catch (err) {
      console.error('Upload failed:', err);
      // Still add locally even if upload fails
      const url = URL.createObjectURL(blob);
      setRecordings(prev => [{
        id: `local_${Date.now()}`,
        title: `${source} – ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        date: 'Just now', duration: formatTime(duration), speakers: ['You'], audioUrl: url
      }, ...prev]);
      alert('Upload to server failed. Recording saved locally instead.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newFolder = await createFolder(newFolderName.trim());
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (err) { console.error('Failed to create folder:', err); }
  };

  const handleRenameFolder = async (folderId) => {
    if (!editingFolderName.trim()) { setEditingFolderId(null); return; }
    try {
      await renameFolder(folderId, editingFolderName.trim());
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: editingFolderName.trim() } : f));
    } catch (err) { console.error('Failed to rename folder:', err); }
    setEditingFolderId(null);
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await deleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (activeFolder === folderId) setActiveFolder('root');
    } catch (err) { console.error('Failed to delete folder:', err); }
  };

  const handleRenameRecording = async (recordingId) => {
    if (!renameRecordingTitle.trim()) { setRenameRecordingId(null); return; }
    try {
      await updateRecording(recordingId, { title: renameRecordingTitle.trim() });
      setRecordings(prev => prev.map(r => r.id === recordingId ? { ...r, title: renameRecordingTitle.trim() } : r));
      if (selectedRecording?.id === recordingId) setSelectedRecording(prev => prev ? { ...prev, title: renameRecordingTitle.trim() } : prev);
    } catch (err) { console.error('Failed to rename:', err); }
    setRenameRecordingId(null);
  };

const deleteRecording = async (recordingId) => {
    try {
      await fetch(`http://localhost:8000/api/recordings/${recordingId}`, { method: 'DELETE' });
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      if (selectedRecording?.id === recordingId) { setSelectedRecording(null); setView('dashboard'); }
    } catch (err) { console.error('Delete failed:', err); alert('Delete failed. Please try again.'); }
    setContextMenu(null);
  };

  const handleMoveRecording = async (recordingId, folderId) => {
    try {
      await updateRecording(recordingId, { folder_id: folderId === 'root' ? '' : folderId });
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      setContextMenu(null);
    } catch (err) { console.error('Failed to move:', err); }
  };

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleDownloadAudio = async (rec) => {
    const recId = rec.id || rec._id;
    const url = rec.audioUrl || `http://localhost:8000/api/recordings/${recId}/audio`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${rec.title || 'recording'}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BRAND_BLUE }}>
              <AudioWaveform className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ScreenApp</span>
          </button>
        </div>
        <div className="p-3 flex-1">
          <button onClick={startRealRecording} className="flex items-center gap-2 w-full text-white text-sm font-semibold py-2.5 px-3 rounded-xl hover:opacity-90 transition-opacity duration-150 mb-4" style={{ background: BRAND_BLUE }}>
            <Plus className="w-4 h-4" /> New Recording
          </button>
          {[{ Icon: Home, label: 'Home' }].map(({ Icon, label }) => (
            <button key={label} onClick={() => setView('dashboard')} className="flex items-center gap-2.5 w-full text-sm py-2 px-3 rounded-lg mb-1 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors duration-150">
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <div className="mt-3">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Folders</span>
              <button onClick={() => setShowNewFolder(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-700 text-gray-500 hover:text-white transition-colors text-xs">+</button>
            </div>
            <button onClick={() => setActiveFolder('all')} className={`flex items-center gap-2 w-full text-xs py-1.5 px-3 rounded-lg mb-0.5 ${activeFolder === 'all' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
              <Star className="w-3 h-3" /> All
            </button>
            <button onClick={() => setActiveFolder('root')} className={`flex items-center gap-2 w-full text-xs py-1.5 px-3 rounded-lg mb-0.5 ${activeFolder === 'root' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
              <Folder className="w-3 h-3" /> All Recordings
            </button>
            {folders.map(folder => (
              <div key={folder.id} className="group flex items-center gap-1">
                {editingFolderId === folder.id ? (
                  <input autoFocus value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)}
                    onBlur={() => handleRenameFolder(folder.id)} onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null); }}
                    className="flex-1 text-xs py-1 px-2 mx-1 rounded bg-gray-700 text-white outline-none" />
                ) : (
                  <button onClick={() => setActiveFolder(folder.id)} onContextMenu={(e) => { e.preventDefault(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                    className={`flex-1 flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg mb-0.5 ${activeFolder === folder.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                    <Folder className="w-3 h-3" /> {folder.name} <span className="ml-auto text-gray-600">{folder.recording_count}</span>
                  </button>
                )}
                <button onClick={() => handleDeleteFolder(folder.id)} className="w-5 h-5 mr-1 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center text-gray-500 hover:text-red-400 transition-opacity">×</button>
              </div>
            ))}
            {showNewFolder && (
              <div className="px-2 mt-1">
                <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onBlur={() => { if (!newFolderName.trim()) setShowNewFolder(false); else handleCreateFolder(); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
                  placeholder="Folder name..." className="w-full text-xs py-1 px-2 rounded bg-gray-800 border border-gray-600 text-white outline-none placeholder-gray-500" />
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2 tracking-wider">Recent</p>
            {isLoadingRecordings ? (
              <p className="text-xs text-gray-500 px-3 py-2">Loading...</p>
            ) : (
              recordings.slice(0, 6).map(rec => (
                <button key={rec.id} onClick={() => openRecording(rec)} className={`flex items-center gap-2 w-full text-xs py-1.5 px-3 rounded-lg mb-0.5 text-left transition-colors duration-150 ${selectedRecording?.id === rec.id && view === 'viewer' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                  <Mic className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{rec.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="p-3 border-t border-gray-800 space-y-1">
          <button onClick={() => setShowExtension(true)} className="flex items-center gap-2.5 w-full text-sm text-gray-400 hover:text-white py-2 px-3 rounded-lg transition-colors duration-150">
            <svg width="14" height="14" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8"/><circle cx="50" cy="50" r="16" fill="currentColor"/><path d="M50 10v40M84 67L50 50M16 67L50 50" stroke="white" strokeWidth="7"/></svg>
            Chrome Extension
          </button>
          <button className="flex items-center gap-2.5 w-full text-sm text-gray-400 hover:text-white py-2 px-3 rounded-lg transition-colors duration-150">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-md">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input className="text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 w-full" placeholder="How can I help?" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors duration-150">
              <Clock className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: BRAND_BLUE }}>U</div>
          </div>
        </div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              {/* Live Extension Recording Panel */}
              {liveExtensionRecording && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <span className="text-sm font-bold text-red-700">Recording in Progress</span>
                    <span className="text-xs text-red-500 ml-auto">
                      {(() => {
                        const elapsed = Math.floor((Date.now() - liveExtensionRecording.startTime) / 1000);
                        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
                        const s = String(elapsed % 60).padStart(2, '0');
                        return `${m}:${s}`;
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mb-3">
                    {liveExtensionRecording.tabCount} tab(s) being recorded via Chrome Extension.
                    Stop the recording in the extension popup to save and upload.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowExtension(true)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Open Extension to Stop
                    </button>
                    <span className="text-xs text-red-400 self-center">
                      Live panel appears when extension is actively recording
                    </span>
                  </div>
                </div>
              )}

              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
              <p className="text-gray-500 text-sm mb-8">Start a new recording or continue where you left off.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { Icon: Mic, label: 'Record Audio', desc: 'Capture microphone audio', action: startRealRecording, primary: true },
                  { Icon: Upload, label: 'Import File', desc: 'Upload audio or video', action: () => fileInputRef.current?.click(), primary: false },
                  { Icon: Share2, label: 'Import URL', desc: 'From Zoom, Meet, YouTube', action: () => { const url = window.prompt('Enter URL to import:'); if (url && url.trim()) alert('URL import: ' + url.trim() + '\n\nFeature coming soon!'); }, primary: false },
                ].map(({ Icon, label, desc, action, primary }) => (
                  <button key={label} onClick={action} className={`flex flex-col items-start gap-3 p-5 rounded-2xl text-left hover:scale-105 transition-transform duration-150 ${primary ? 'text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-900 hover:shadow-md'}`} style={primary ? { background: BRAND_BLUE } : {}}>
                    <Icon className={`w-5 h-5 ${primary ? 'text-white' : 'text-gray-600'}`} />
                    <div>
                      <div className={`text-sm font-semibold ${primary ? 'text-white' : 'text-gray-900'}`}>{label}</div>
                      <div className={`text-xs mt-0.5 ${primary ? 'text-white/70' : 'text-gray-400'}`}>{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Recordings</h2>
              <div className="space-y-2">
                {isLoadingRecordings ? (
                  <div className="text-center py-8 text-sm text-gray-400">Loading recordings...</div>
                ) : recordings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">No recordings yet. Start by clicking "Record Audio" above.</div>
                ) : (
                  recordings.map(rec => (
                    <button key={rec.id} onClick={() => openRecording(rec)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ rec, x: e.clientX, y: e.clientY }); }}
                      className="flex items-center gap-4 w-full bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow duration-150 text-left group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rec.audioUrl ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                        <Mic className={`w-5 h-5 ${rec.audioUrl ? 'text-emerald-500' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                          {renameRecordingId === rec.id ? (
                            <input autoFocus value={renameRecordingTitle} onChange={e => setRenameRecordingTitle(e.target.value)}
                              onBlur={() => handleRenameRecording(rec.id)} onKeyDown={e => { if (e.key === 'Enter') handleRenameRecording(rec.id); if (e.key === 'Escape') setRenameRecordingId(null); }}
                              className="text-sm font-semibold text-gray-900 bg-gray-100 border border-blue-400 rounded px-1 outline-none w-full" />
                          ) : (
                            <span onDoubleClick={(e) => { e.stopPropagation(); setRenameRecordingId(rec.id); setRenameRecordingTitle(rec.title); }}>{rec.title}</span>
                          )}
                          {rec.audioUrl && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Recorded</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(rec.created_at)}{rec.size ? ` · ${formatBytes(rec.size)}` : ''}{rec.duration ? ` · ${formatTime(rec.duration)}` : rec._duration ? ` · ${formatTime(rec._duration)}` : ''}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors duration-150 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recorder */}
        {view === 'recorder' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-12 shadow-lg max-w-md w-full text-center border border-gray-100">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full bg-red-500 ${!isPaused ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-semibold text-gray-700">{isPaused ? 'PAUSED' : 'RECORDING'}</span>
              </div>
              <div className="text-5xl font-mono font-bold text-gray-900 mb-6">{formatTime(recordingTime)}</div>
              <RecordingWaveform isActive={isRecording && !isPaused} liveHeights={liveWaveform} />
              <p className="text-sm text-gray-400 mt-4 mb-8">
                {liveWaveform ? 'Live audio detected — AI transcribing in real-time' : 'Speak now — AI is listening and transcribing'}
              </p>
              <div className="flex items-center justify-center gap-4">
                <button onClick={togglePause} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors duration-150">
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                <button onClick={stopRealRecording} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors duration-150 shadow-lg">
                  <Square className="w-6 h-6 fill-white" />
                </button>
                <button onClick={discardRecording} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors duration-150">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-5">■ Stop &amp; save · ✕ Discard</p>
            </div>
          </div>
        )}

        {/* Viewer */}
        {view === 'viewer' && selectedRecording && (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 flex items-center gap-3 border-b border-gray-200 bg-white">
                <button onClick={() => setView('dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 truncate">{selectedRecording.title}</h2>
                  <p className="text-xs text-gray-400">{formatDateTime(selectedRecording.created_at)}{selectedRecording.size ? ` · ${formatBytes(selectedRecording.size)}` : ''}{selectedRecording.duration ? ` · ${formatTime(selectedRecording.duration)}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownloadAudio(selectedRecording)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150" title="Share">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-5 overflow-auto bg-white">
                {selectedRecording.audioUrl ? (
                  <div className="mb-5">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Mic className="w-4 h-4 text-emerald-600" /></div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{selectedRecording.title}</div>
                          <div className="text-xs text-gray-400">{formatDateTime(selectedRecording.created_at)}{selectedRecording.size ? ` · ${formatBytes(selectedRecording.size)}` : ''}</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Mic className="w-4 h-4 text-emerald-600" /></div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{selectedRecording.title}</div>
                            <div className="text-xs text-gray-400">{formatDateTime(selectedRecording.created_at)}{selectedRecording.size ? ` · ${formatBytes(selectedRecording.size)}` : ''}{selectedRecording.duration ? ` · ${formatTime(selectedRecording.duration)}` : ''}</div>
                          </div>
                        </div>
                        <audio ref={el => {
                          if (!el) return;
                          el.onloadedmetadata = () => {
                            el.currentTime = 0;
                          };
                        }} controls preload="metadata" src={selectedRecording.audioUrl} className="w-full rounded-lg" style={{ height: 40 }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-2xl p-5 mb-4">
                    <div className="flex items-center gap-4 mb-3">
                      <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors duration-150">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </button>
                      <div className="flex-1">
                        <div className="flex gap-0.5 h-10 items-center">
                          {Array(48).fill(0).map((_, i) => (
                            <div key={i} className="flex-1 rounded-sm" style={{ height: (Math.sin(i * 0.45) * 0.5 + 0.5) * 28 + 4, background: i < 12 ? BRAND_BLUE : '#374151' }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-mono whitespace-nowrap">2:34 / {selectedRecording.duration}</span>
                      <Volume2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1"><div className="h-1 rounded-full" style={{ width: '20%', background: BRAND_BLUE }} /></div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleTabChange('summary')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-150">Action Items</button>
                  <button onClick={() => handleTabChange('summary')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors duration-150">Key Decisions</button>
                  <button onClick={() => setActiveTab('chat')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors duration-150">Follow-ups</button>
                  <button onClick={() => { const t = selectedRecording.transcript; const s = selectedRecording.summary; const text = typeof s === 'string' ? s : (typeof t === 'string' ? t : ''); if (!text) return; const blob = new Blob([text], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${selectedRecording.title}.txt`; a.click(); }} className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-150">Export TXT</button>
                </div>
              </div>
            </div>

            {/* Transcript Panel */}
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
              <div className="flex border-b border-gray-200">
                {[{ id: 'transcript', label: 'Transcript', Icon: FileText }, { id: 'summary', label: 'Summary', Icon: CheckSquare }, { id: 'chat', label: 'Chat', Icon: MessageSquare }].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => handleTabChange(id)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors duration-150 ${activeTab === id ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {activeTab === 'transcript' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedRecording.audioUrl ? (
                    isTranscribing ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">Processing transcript...</p>
                      </div>
                    ) : selectedRecording.transcript ? (
                      <div className="space-y-1">
                        {(() => {
                          const t = selectedRecording.transcript;
                          if (typeof t === 'string') {
                            return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{t}</p>;
                          }
                          if (Array.isArray(t)) {
                            return t.map((line, i) => (
                              <div key={i} className="group cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors duration-150">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-gray-400 w-8">{line.time || ''}</span>
                                  <span className={`text-xs font-bold ${SPEAKER_COLORS[line.speaker] || 'text-gray-600'}`}>{line.speaker || 'Unknown'}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed pl-8">{line.text || line}</p>
                              </div>
                            ));
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500">Transcript Ready</p>
                        <p className="text-xs text-gray-400 mt-1">Click the Transcript tab to process this recording.</p>
                      </div>
                    )
                  ) : (
                    (() => {
                      const t = selectedRecording.transcript;
                      if (!t) return null;
                      if (typeof t === 'string') {
                        return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{t}</p>;
                      }
                      if (Array.isArray(t)) {
                        return t.map((line, i) => (
                          <div key={i} className="group cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors duration-150">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400 w-8">{line.time || ''}</span>
                              <span className={`text-xs font-bold ${SPEAKER_COLORS[line.speaker] || 'text-gray-600'}`}>{line.speaker || 'Unknown'}</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed pl-10">{line.text || line}</p>
                          </div>
                        ));
                      }
                      return null;
                    })()
                  )}
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {isSummarizing ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-500 font-medium">Generating summary...</p>
                    </div>
                  ) : selectedRecording.summary ? (
                    (() => {
                      const summary = selectedRecording.summary;
                      const keyPoints = summary.keyPoints || (Array.isArray(summary) ? summary.map(s => typeof s === 'string' ? s : s.point || s.text) : []);
                      const actionItems = summary.actionItems || [];
                      const decisions = summary.decisions || [];
                      return (
                        <>
                          {keyPoints.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Points</h3>
                              {keyPoints.map((item, i) => (
                                <div key={i} className="flex gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" /><p className="text-sm text-gray-700 leading-relaxed">{typeof item === 'string' ? item : item.point || item.text || JSON.stringify(item)}</p></div>
                              ))}
                            </div>
                          )}
                          {actionItems.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Action Items</h3>
                              {actionItems.map((item, i) => (
                                <div key={i} className="flex gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" /><p className="text-sm text-gray-700 leading-relaxed">{typeof item === 'string' ? item : item.item || item.text || JSON.stringify(item)}</p></div>
                              ))}
                            </div>
                          )}
                          {decisions.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Decisions</h3>
                              {decisions.map((item, i) => (
                                <div key={i} className="flex gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" /><p className="text-sm text-gray-700 leading-relaxed">{typeof item === 'string' ? item : item.decision || item.text || JSON.stringify(item)}</p></div>
                              ))}
                            </div>
                          )}
                          {keyPoints.length === 0 && actionItems.length === 0 && decisions.length === 0 && (
                            <p className="text-sm text-gray-500">{typeof summary === 'string' ? summary : JSON.stringify(summary)}</p>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8">
                      <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">Summary Ready</p>
                      <p className="text-xs text-gray-400 mt-1">Click the Summary tab to generate key points and action items.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-700'}`} style={msg.role === 'user' ? { background: BRAND_BLUE } : {}}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isAITyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-3 py-2 flex gap-1 items-center">
                          {[0, 0.15, 0.3].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                        placeholder="Ask about this recording..."
                        className="flex-1 text-sm bg-gray-50 rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-blue-400 transition-colors duration-150 placeholder-gray-400" />
                      <button onClick={sendChat} disabled={!chatInput.trim()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity duration-150"
                        style={{ background: BRAND_BLUE }}><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showExtension && <ChromeExtModal onClose={() => setShowExtension(false)} onSave={handleExtSave} />}

      <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          alert('File import: ' + file.name + '\n\nFeature coming soon!');
          e.target.value = '';
        }} />

      {contextMenu && (
        <div className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-48 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { setRenameRecordingId(contextMenu.rec.id); setRenameRecordingTitle(contextMenu.rec.title); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Rename
          </button>
          <div className="px-4 py-2 text-xs text-gray-400 font-semibold">Move to</div>
          <button onClick={() => handleMoveRecording(contextMenu.rec.id, 'root')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs">📁 All Recordings</button>
          {folders.map(f => (
            <button key={f.id} onClick={() => handleMoveRecording(contextMenu.rec.id, f.id)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs flex items-center gap-1">
              <Folder className="w-3 h-3" /> {f.name}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1" />
          <button onClick={() => { if (window.confirm(`Delete "${contextMenu.rec.title}"? This cannot be undone.`)) deleteRecording(contextMenu.rec.id); }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-500 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      {/* Upload indicator overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">Uploading recording...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppPage;