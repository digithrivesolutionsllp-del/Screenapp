import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AudioWaveform, Home, Folder, Star, Plus, Search, Settings,
  Mic, Square, Pause, Play, Volume2, Download, Share2,
  ChevronRight, Send, Clock, MoreHorizontal, X, FileText,
  CheckSquare, MessageSquare, Upload, ArrowLeft, Trash2,
  Globe, ExternalLink, Copy, Info, Link, Mail, Lock, User
} from 'lucide-react';
import { uploadRecording as apiUploadRecording, getRecordings as apiGetRecordings, transcribeRecording as apiTranscribeRecording, summarizeRecording as apiSummarizeRecording, chatWithRecording as apiChatWithRecording, getFolders, createFolder, renameFolder, deleteFolder, updateRecording, updateRecordingStatus, loginUser, registerUser, logoutUser, getCurrentUser } from '../lib/api';

const BRAND_BLUE = '#4175F5';
const API_BASE = (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || 'http://localhost:8000/api';
const SPEAKER_COLORS = {
  John: 'text-blue-500', Sarah: 'text-violet-500', Mike: 'text-emerald-500',
  Client: 'text-orange-500', You: 'text-rose-500'
};
const formatTime = (s) =>
  `${String(Math.floor(s > 0 && Number.isFinite(s) ? s / 60 : 0)).padStart(2, '0')}:${String(s > 0 && Number.isFinite(s) ? s % 60 : 0).padStart(2, '0')}`;

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
    // Ensure we're comparing in the same timezone — d.toLocaleDateString uses local timezone
    const dDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const now = new Date();
    const nowDate = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const dTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // Same day — show "Today · HH:MM"
      return 'Today · ' + dTime;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return dDate + (diffDays > 365 ? ' · ' + d.getFullYear() : '');
    }
  } catch {
    return dateStr;
  }
};

// --- Toast helper (inline, no external deps) ---
const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
    <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onClose} className="text-gray-400 hover:text-white ml-1"><X className="w-4 h-4" /></button>
  </div>
);

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
              {toggles.tabAudio && <span className="text-xs text-gray-400 font-normal ml-1">- Tab audio</span>}
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
                <li className="flex gap-1.5"><span className="font-bold flex-shrink-0">3.</span> In Chrome dialog -> click <strong>"Chrome Tab"</strong></li>
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
  const [liveExtensionRecording, setLiveExtensionRecording] = useState(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [renameRecordingId, setRenameRecordingId] = useState(null);
  const [renameRecordingTitle, setRenameRecordingTitle] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const fileInputRef = useRef(null);

  // New state for fixed UI elements
  const [showSettings, setShowSettings] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [urlImportValue, setUrlImportValue] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [toast, setToast] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  // Audio player state
  const audioElRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(0);

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const user = authMode === 'login'
        ? await loginUser(authEmail, authPassword)
        : await registerUser(authEmail, authPassword, authName);
      setCurrentUser(user);
      showToast(`Welcome${user.name ? ', ' + user.name : '!'} `);
    } catch (err) {
      setAuthError(err?.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    showToast('Logged out');
  };

  // ── Login / Register Modal ─────────────────────────────────────────────────
  const AuthModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BRAND_BLUE }}>
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {authMode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-gray-400">
                {authMode === 'login' ? 'Sign in to your ScreenApp account' : 'Start recording with ScreenApp'}
              </p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={authName} onChange={e => setAuthName(e.target.value)} required
                    placeholder="Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit" disabled={authLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: BRAND_BLUE }}
            >
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              className="font-semibold hover:underline" style={{ color: BRAND_BLUE }}
            >
              {authMode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // Show login if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <AuthModal />
      </div>
    );
  }

  // Show toast helper
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Clock: update every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // Load recordings when folder changes
  useEffect(() => {
    const loadRecordings = async () => {
      setIsLoadingRecordings(true);
      try {
        const apiBase = API_BASE;
        const url = activeFolder === 'root'
          ? `${apiBase}/recordings?folder_id=`
          : activeFolder === 'all'
          ? `${apiBase}/recordings?folder_id=all`
          : `${apiBase}/recordings?folder_id=${activeFolder}`;
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

  // fetchRecordingsList — reloads the recordings list from the API.
  // Used both for periodic refresh and for immediate refresh after a recording stops.
  const fetchRecordingsList = async () => {
    try {
      const url = activeFolder === 'root'
        ? `${API_BASE}/recordings?folder_id=`
        : activeFolder === 'all'
        ? `${API_BASE}/recordings?folder_id=all`
        : `${API_BASE}/recordings?folder_id=${activeFolder}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setRecordings(list.map(r => ({ ...r, id: r.id || r._id })));
    } catch (err) {
      console.error('fetchRecordingsList failed:', err);
    }
  };

  // Dedicated live-state polling — always active, independent of recordings state
  useEffect(() => {
    const pollLive = async () => {
      try {
        const res = await fetch(`${API_BASE}/recordings/live-state`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.recording && typeof data.recording === 'object') {
          setLiveExtensionRecording({
            startTime: data.recording.start_time,
            tabCount: data.recording.tab_count,
            title: data.recording.title,
            updatedAt: Date.now()
          });
        } else {
          // Recording stopped — clear the live panel AND refresh recordings list
          if (liveExtensionRecording) {
            // There was a recording, now it's gone — fetch fresh recordings
            fetchRecordingsList();
          }
          setLiveExtensionRecording(null);
          setLiveElapsed(0);
        }
      } catch (e) {
        console.warn('Live state poll failed:', e);
      }
    };

    pollLive(); // run immediately on mount
    const interval = setInterval(pollLive, 5000);
    return () => clearInterval(interval);
  }, [liveExtensionRecording]); // re-create interval when live state changes so we capture the prior value

  // Auto-refresh recordings list every 10 seconds
  useEffect(() => {
    let cancelled = false;
    const loadRecordings = async () => {
      try {
        const url = activeFolder === 'root'
          ? `${API_BASE}/recordings?folder_id=`
          : activeFolder === 'all'
          ? `${API_BASE}/recordings?folder_id=all`
          : `${API_BASE}/recordings?folder_id=${activeFolder}`;
        const response = await fetch(url);
        if (cancelled) return;
        const data = await response.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const fresh = list.map(r => ({ ...r, id: r.id || r._id }));
        setRecordings(prev => {
          if (prev.length === 0) return fresh; // initial load — replace
          const existingIds = new Set(prev.map(r => r.id));
          const newOnes = fresh.filter(r => !existingIds.has(r.id));
          return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
        });
      } catch (err) { /* silent */ } finally {
        if (!cancelled) setIsLoadingRecordings(false);
      }
    };

    setIsLoadingRecordings(true);
    loadRecordings();
    const interval = setInterval(loadRecordings, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeFolder]);

  // Live recording elapsed timer — updates every second, re-fires when polling updates state
  useEffect(() => {
    if (!liveExtensionRecording?.startTime) return;
    const tick = () => {
      setLiveElapsed(Math.floor((Date.now() - liveExtensionRecording.startTime) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [liveExtensionRecording?.startTime, liveExtensionRecording?.updatedAt]);

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
          title: `Recording - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
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

  const stopLiveExtensionRecording = async () => {
    const extId = localStorage.getItem('screenapp_extension_id') || '';
    if (extId && window.chrome?.runtime?.sendMessage) {
      try { await window.chrome.runtime.sendMessage(extId, { type: 'STOP_RECORDING' }); } catch (e) { /* extension may not be available */ }
    }
    try { await fetch(`${API_BASE}/recordings/live-state`, { method: 'DELETE' }); } catch (e) { /* silent */ }
    setLiveExtensionRecording(null);
    setLiveElapsed(0);
    // Refresh the recordings list immediately so the new recording appears on the dashboard
    await fetchRecordingsList();
  };

  // Sync duration from recording object when available (server-side duration)
  useEffect(() => {
    if (selectedRecording?.duration && !duration) {
      setDuration(selectedRecording.duration);
    }
  }, [selectedRecording?.duration]);

  const openRecording = async (rec) => {
    const recId = rec.id || rec._id;
    setDuration(NaN);
    setPlaybackPosition(0);
    setIsPlaying(false);
    const audioUrl = rec.audioUrl || `${API_BASE}/recordings/${recId}/audio`;
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
        const newTranscript = data.transcript || data;
        setSelectedRecording(prev => prev ? { ...prev, transcript: newTranscript, segments: data.segments || [], isTranscribed: true } : prev);
        setRecordings(prev => prev.map(r => (r.id === recId || r._id === recId) ? { ...r, transcript: newTranscript, segments: data.segments || [], status: 'transcribed' } : r));
        try { await updateRecordingStatus(recId, 'transcribed'); } catch (e) { /* silent */ }
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
        const newSummary = data.summary || data;
        setSelectedRecording(prev => prev ? { ...prev, summary: newSummary, isSummarized: true } : prev);
        setRecordings(prev => prev.map(r => (r.id === recId || r._id === recId) ? { ...r, summary: newSummary, status: 'summarized' } : r));
        try { await updateRecordingStatus(recId, 'summarized'); } catch (e) { /* silent */ }
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
        title: `${source} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        date: 'Just now',
        duration: formatTime(duration),
        speakers: ['You'],
        audioUrl: data.audioUrl || URL.createObjectURL(blob),
      };
      setRecordings(prev => [newRecording, ...prev]);
    } catch (err) {
      console.error('Upload failed:', err);
      const url = URL.createObjectURL(blob);
      setRecordings(prev => [{
        id: `local_${Date.now()}`,
        title: `${source} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
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
      await fetch(`${API_BASE}/recordings/${recordingId}`, { method: 'DELETE' });
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
    const url = rec.audioUrl || `${API_BASE}/recordings/${recId}/audio`;
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

  // Status badge for recording cards
  const getStatusBadge = (recording) => {
    if (recording.status === 'processing') {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Processing</span>;
    }
    if (recording.transcription && recording.summary) {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Complete</span>;
    }
    if (recording.transcription) {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Transcribed</span>;
    }
    if (recording.status === 'transcribed') {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Transcribed</span>;
    }
    if (recording.status === 'summarized') {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Complete</span>;
    }
    if (recording.status === 'new') {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>;
    }
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>;
  };

  // Search filter
  const filteredRecordings = searchQuery.trim()
    ? recordings.filter(r => r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recordings;

  // Close URL import modal
  const handleUrlImport = () => {
    if (!urlImportValue.trim()) return;
    setUrlImportValue('');
    setShowUrlImport(false);
    showToast('URL import coming soon');
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

          {/* Home button - always navigates to dashboard, highlighted when on dashboard */}
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2.5 w-full text-sm py-2 px-3 rounded-lg mb-1 transition-colors duration-150 ${
              view === 'dashboard'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Home className="w-4 h-4" /> Home
          </button>

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
            ) : recordings.length === 0 ? (
              <p className="text-xs text-gray-500 px-3 py-2">No recordings</p>
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
          <button onClick={() => setShowAbout(true)} className="flex items-center gap-2.5 w-full text-sm text-gray-400 hover:text-white py-2 px-3 rounded-lg transition-colors duration-150">
            <Info className="w-4 h-4" /> About
          </button>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2.5 w-full text-sm text-gray-400 hover:text-white py-2 px-3 rounded-lg transition-colors duration-150">
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
            <input
              className="text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 w-full"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentTime}</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: BRAND_BLUE }}>U</div>
          </div>
        </div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              {/* Live Extension Recording Panel — always visible, reacts to live state */}
              <div className={`mb-6 rounded-2xl p-5 border-2 transition-all duration-500 ${
                liveExtensionRecording
                  ? 'bg-gradient-to-r from-red-50 to-amber-50 border-red-300 shadow-lg shadow-red-100'
                  : 'bg-gray-50 border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${liveExtensionRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className={`text-base font-bold ${liveExtensionRecording ? 'text-red-800' : 'text-gray-400'}`}>
                      {liveExtensionRecording ? 'Recording in Progress' : 'Live Recordings'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${liveExtensionRecording ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <span className={`text-sm font-mono font-bold ${liveExtensionRecording ? 'text-red-700' : 'text-gray-400'}`}>
                      {formatTime(liveElapsed)}
                    </span>
                  </div>
                </div>

                {liveExtensionRecording ? (
                  <>
                    {liveExtensionRecording.title && (
                      <p className="text-sm text-red-700 font-medium mb-1 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-red-200 text-red-600 flex items-center justify-center text-xs font-bold">
                          {liveExtensionRecording.tabCount}
                        </span>
                        {liveExtensionRecording.title}
                      </p>
                    )}
                    <div className="flex gap-1 items-center mt-3 mb-4">
                      {[...Array(16)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full animate-pulse bg-red-400"
                          style={{
                            height: `${Math.sin(i * 0.7 + Date.now() * 0.005) * 12 + 16}px`,
                            animationDelay: `${i * 0.08}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-200 text-red-800 border border-red-300">
                        LIVE
                      </span>
                      <span className="text-xs text-red-600">
                        Recording audio via Chrome Extension
                      </span>
                      <button
                        onClick={stopLiveExtensionRecording}
                        className="ml-auto text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        Stop Recording
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    No active recording — start one from the Chrome Extension
                  </p>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
              <p className="text-gray-500 text-sm mb-8">Start a new recording or continue where you left off.</p>

              {searchQuery.trim() && (
                <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Showing {filteredRecordings.length} result{filteredRecordings.length !== 1 ? 's' : ''} for "<strong>{searchQuery}</strong>"</span>
                  <button onClick={() => setSearchQuery('')} className="ml-auto text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                </div>
              )}

              <button onClick={startRealRecording} className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left hover:scale-105 transition-transform duration-150 text-white shadow-lg" style={{ background: BRAND_BLUE, maxWidth: 320 }}>
                <Mic className="w-5 h-5 text-white" />
                <div>
                  <div className="text-sm font-semibold text-white">Record Audio</div>
                  <div className="text-xs mt-0.5 text-white/70">Capture microphone audio</div>
                </div>
              </button>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Recordings</h2>
              <div className="space-y-2">
                {isLoadingRecordings ? (
                  <div className="text-center py-8 text-sm text-gray-400">Loading recordings...</div>
                ) : filteredRecordings.length === 0 ? (
                  searchQuery.trim() ? (
                    <div className="text-center py-8">
                      <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No recordings match "<strong>{searchQuery}</strong>"</p>
                      <button onClick={() => setSearchQuery('')} className="text-xs text-blue-500 hover:underline mt-1">Clear search</button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-400">No recordings yet. Start by clicking "Record Audio" above.</div>
                  )
                ) : (
                  filteredRecordings.map(rec => (
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
                          {getStatusBadge(rec)}
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
                {liveWaveform ? 'Live audio detected - AI transcribing in real-time' : 'Speak now - AI is listening and transcribing'}
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900 truncate">{selectedRecording.title}</h2>
                    {selectedRecording.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        selectedRecording.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        selectedRecording.status === 'transcribed' || selectedRecording.status === 'processing' ? 'bg-violet-100 text-violet-700' :
                        selectedRecording.status === 'summarized' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{selectedRecording.status}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{formatDateTime(selectedRecording.created_at)}{selectedRecording.size ? ` · ${formatBytes(selectedRecording.size)}` : ''}{selectedRecording.duration ? ` · ${formatTime(selectedRecording.duration)}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownloadAudio(selectedRecording)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowShareModal(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150" title="Share">
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
                    <audio
                      ref={audioElRef}
                      preload="metadata"
                      src={selectedRecording.audioUrl}
                      onLoadedMetadata={() => { if (audioElRef.current && Number.isFinite(audioElRef.current.duration)) { audioElRef.current.currentTime = 0; setDuration(audioElRef.current.duration); } }}
                      onTimeUpdate={() => { if (audioElRef.current && Number.isFinite(audioElRef.current.currentTime)) setPlaybackPosition(audioElRef.current.currentTime); }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => { setIsPlaying(false); setPlaybackPosition(0); }}
                      onVolumeChange={() => { if (audioElRef.current) setVolume(audioElRef.current.volume); }}
                      className="hidden"
                    />
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Mic className="w-4 h-4 text-emerald-600" /></div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{selectedRecording.title}</div>
                          <div className="text-xs text-gray-400">{formatDateTime(selectedRecording.created_at)}{selectedRecording.size ? ` · ${formatBytes(selectedRecording.size)}` : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { if (!audioElRef.current) return; if (isPlaying) { audioElRef.current.pause(); } else { audioElRef.current.play(); } }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-opacity hover:opacity-85"
                          style={{ background: BRAND_BLUE }}
                        >
                          {isPlaying
                            ? <Pause className="w-4 h-4" />
                            : <Play className="w-4 h-4 ml-0.5" />
                          }
                        </button>
                        <div className="flex-1">
                          <div
                            className="w-full h-1.5 bg-gray-200 rounded-full cursor-pointer group"
                            onClick={(e) => {
                              if (!audioElRef.current || !duration || !Number.isFinite(duration)) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                              const newTime = ratio * duration;
                              if (Number.isFinite(newTime)) audioElRef.current.currentTime = newTime;
                            }}
                          >
                            <div
                              className="h-1.5 rounded-full transition-all duration-100"
                              style={{ width: `${duration ? (playbackPosition / duration) * 100 : 0}%`, background: BRAND_BLUE }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500 font-mono">{formatTime(playbackPosition)}</span>
                            <span className="text-xs text-gray-400 font-mono">{duration ? formatTime(duration) : '--:--'}</span>
                          </div>
                        </div>
                        <Volume2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={(e) => { if (audioElRef.current) { audioElRef.current.volume = parseFloat(e.target.value); setVolume(parseFloat(e.target.value)); } }}
                          className="w-16 h-1 accent-blue-500"
                          title={`Volume: ${Math.round(volume * 100)}%`}
                        />
                        <select
                          value={playbackSpeed}
                          onChange={(e) => { if (audioElRef.current) { audioElRef.current.playbackRate = parseFloat(e.target.value); setPlaybackSpeed(parseFloat(e.target.value)); } }}
                          className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-600 cursor-pointer outline-none"
                          title="Playback speed"
                        >
                          <option value="0.5">0.5x</option>
                          <option value="0.75">0.75x</option>
                          <option value="1">1x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2x</option>
                        </select>
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
                      <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                        {selectedRecording.duration ? `${formatTime(selectedRecording.duration)}` : '--:--'}
                      </span>
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
                    ) : selectedRecording.transcript || selectedRecording.segments ? (
                      <div className="space-y-1">
                        {(() => {
                          const segs = selectedRecording.segments;
                          if (segs && Array.isArray(segs) && segs.length > 0) {
                            return segs.map((seg, i) => (
                              <div key={i} className="group cursor-pointer hover:bg-blue-50 rounded-lg p-1 -mx-1 transition-colors duration-150">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <button
                                    onClick={() => { if (audioElRef.current && Number.isFinite(seg.start)) audioElRef.current.currentTime = seg.start; }}
                                    className="text-xs font-mono text-gray-400 hover:text-blue-500 w-10 flex-shrink-0 text-left transition-colors"
                                  >{seg.time}</button>
                                  <span className="text-xs text-gray-200">-</span>
                                  <button
                                    onClick={() => { if (audioElRef.current && seg.end != null && Number.isFinite(seg.end)) audioElRef.current.currentTime = seg.end; }}
                                    className="text-xs font-mono text-gray-300 hover:text-blue-400 transition-colors"
                                  >{seg.end != null ? formatTime(seg.end) : ''}</button>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed pl-12">{seg.text}</p>
                              </div>
                            ));
                          }
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
                      const s = selectedRecording.summary;
                      const summaryIsString = typeof s === 'string';
                      const keyPoints = summaryIsString ? [] : (s.keyPoints || []);
                      const actionItems = summaryIsString ? [] : (s.actionItems || []);
                      const roadmap = summaryIsString ? [] : (s.roadmap || []);
                      const takeaways = summaryIsString ? [] : (s.takeaways || []);
                      const tools = summaryIsString ? [] : (s.tools || []);
                      const decisions = summaryIsString ? [] : (s.decisions || []);
                      const sentiment = summaryIsString ? null : (s.sentiment || null);
                      const nextMeetings = summaryIsString ? [] : (s.nextMeetings || []);

                      const priorityStyles = {
                        high: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'High' },
                        medium: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: 'Medium' },
                        low: { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500', label: 'Low' },
                      };
                      const sentimentStyles = {
                        positive: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: '✨' },
                        neutral: { color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: '📋' },
                        negative: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: '⚠️' },
                      };
                      const st = sentiment && sentimentStyles[sentiment] || null;

                      const exportSummary = () => {
                        const lines = [`Summary — ${selectedRecording.title}`, `Generated: ${new Date().toLocaleString()}`, ''];
                        if (st) lines.push(`Sentiment: ${sentiment}`);
                        if (keyPoints.length) { lines.push('KEY POINTS'); keyPoints.forEach((p, i) => lines.push(`  ${i + 1}. ${typeof p === 'string' ? p : p.point || p.text || JSON.stringify(p)}`)); lines.push(''); }
                        if (actionItems.length) { lines.push('ACTION ITEMS'); actionItems.forEach(a => lines.push(`  • [${(a.priority || 'medium').toUpperCase()}] ${typeof a === 'string' ? a : a.task || a.item || JSON.stringify(a)}${a.owner && a.owner !== 'Unassigned' ? ` (${a.owner})` : ''}${a.deadline ? ` — Due: ${a.deadline}` : ''}`)); lines.push(''); }
                        if (roadmap.length) { lines.push('ROADMAP'); roadmap.forEach((r, i) => lines.push(`  ${i + 1}. ${typeof r === 'string' ? r : r.step || JSON.stringify(r)}`)); lines.push(''); }
                        if (takeaways.length) { lines.push('TAKEAWAYS'); takeaways.forEach(t => lines.push(`  • ${typeof t === 'string' ? t : t.learning || JSON.stringify(t)}`)); lines.push(''); }
                        if (tools.length) { lines.push('TOOLS & RESOURCES'); tools.forEach(t => lines.push(`  • ${typeof t === 'string' ? t : t.tool || JSON.stringify(t)}`)); lines.push(''); }
                        if (decisions.length) { lines.push('DECISIONS'); decisions.forEach(d => lines.push(`  ✓ ${typeof d === 'string' ? d : d.decision || JSON.stringify(d)}`)); lines.push(''); }
                        if (nextMeetings.length) { lines.push('NEXT MEETINGS'); nextMeetings.forEach(m => lines.push(`  → ${typeof m === 'string' ? m : m.topic || JSON.stringify(m)}${m.suggestedDate ? ` (${m.suggestedDate})` : ''}`)); lines.push(''); }
                        if (summaryIsString) { lines.push('FULL TEXT'); lines.push(s); }
                        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${selectedRecording.title || 'summary'}_summary.txt`; a.click();
                      };

                      return (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Summary</h3>
                            <button onClick={exportSummary} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" /> Export
                            </button>
                          </div>

                          {st && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${st.bg} ${st.color}`}>
                              <span>{st.icon}</span>
                              <span>Overall sentiment: <span className="font-semibold capitalize">{sentiment}</span></span>
                            </div>
                          )}

                          {actionItems.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Action Items</h3>
                              {actionItems.map((item, i) => {
                                const priority = (typeof item === 'object' ? item.priority : 'medium') || 'medium';
                                const ps = priorityStyles[priority] || priorityStyles.medium;
                                const task = typeof item === 'string' ? item : item.task || item.item || item.text || JSON.stringify(item);
                                const owner = typeof item === 'object' ? item.owner : null;
                                const deadline = typeof item === 'object' ? item.deadline : null;
                                return (
                                  <div key={i} className="flex gap-2.5 mb-2.5 p-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ps.dot}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800 leading-snug">{task}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {owner && owner !== 'Unassigned' && <span className="text-xs text-gray-500 font-medium">👤 {owner}</span>}
                                        {deadline && <span className="text-xs text-gray-400">📅 {deadline}</span>}
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ps.badge}`}>{ps.label}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {roadmap.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Roadmap</h3>
                              <div className="space-y-1.5">
                                {roadmap.map((step, i) => (
                                  <div key={i} className="flex items-start gap-2.5 p-2 bg-violet-50 rounded-xl border border-violet-100">
                                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-xs font-bold">{i + 1}</span>
                                    </div>
                                    <p className="text-sm text-violet-900 leading-snug pt-0.5">{typeof step === 'string' ? step : step.step || step.text || JSON.stringify(step)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {keyPoints.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Points</h3>
                              {keyPoints.map((item, i) => (
                                <div key={i} className="flex gap-2.5 mb-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-700 leading-relaxed">{typeof item === 'string' ? item : item.point || item.text || JSON.stringify(item)}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {takeaways.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Takeaways</h3>
                              {takeaways.map((item, i) => (
                                <div key={i} className="flex gap-2.5 mb-2">
                                  <span className="text-amber-400 flex-shrink-0 mt-0.5">★</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">{typeof item === 'string' ? item : item.learning || item.text || JSON.stringify(item)}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {tools.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tools &amp; Resources</h3>
                              <div className="flex flex-wrap gap-1.5">
                                {tools.map((tool, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200 font-medium">
                                    🔧 {typeof tool === 'string' ? tool : tool.tool || JSON.stringify(tool)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {decisions.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Decisions</h3>
                              {decisions.map((item, i) => (
                                <div key={i} className="flex gap-2.5 mb-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                  <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                                  <p className="text-sm text-emerald-800 leading-snug">{typeof item === 'string' ? item : item.decision || item.text || JSON.stringify(item)}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {nextMeetings.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Next Meetings</h3>
                              {nextMeetings.map((m, i) => (
                                <div key={i} className="flex gap-2.5 mb-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                                  <span className="text-blue-500 flex-shrink-0 mt-0.5">→</span>
                                  <div>
                                    <p className="text-sm text-blue-900 leading-snug">{typeof m === 'string' ? m : m.topic || JSON.stringify(m)}</p>
                                    {m.suggestedDate && <p className="text-xs text-blue-500 mt-0.5">📅 {m.suggestedDate}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {summaryIsString && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Summary</h3>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{s}</p>
                            </div>
                          )}

                          {keyPoints.length === 0 && actionItems.length === 0 && roadmap.length === 0 &&
                           takeaways.length === 0 && tools.length === 0 && decisions.length === 0 &&
                           nextMeetings.length === 0 && !summaryIsString && (
                            <div className="text-center py-8">
                              <p className="text-sm text-gray-500">Could not parse structured summary.</p>
                              <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap text-left bg-gray-50 p-2 rounded">{JSON.stringify(s, null, 2)}</pre>
                            </div>
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

      {/* URL Import Modal */}
      {showUrlImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUrlImport(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><Globe className="w-4 h-4 text-blue-500" /></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Import from URL</h3>
                  <p className="text-xs text-gray-400">Import from Zoom, Google Meet, YouTube, and more</p>
                </div>
              </div>
              <button onClick={() => setShowUrlImport(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Recording URL</label>
              <input
                autoFocus
                type="url"
                value={urlImportValue}
                onChange={e => setUrlImportValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleUrlImport(); if (e.key === 'Escape') setShowUrlImport(false); }}
                placeholder="https://zoom.us/j/..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-colors placeholder-gray-400 mb-3"
              />
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">URL import is coming soon. We'll support Zoom, Google Meet, Microsoft Teams, and YouTube recordings.</p>
                </div>
              </div>
              <button
                onClick={handleUrlImport}
                disabled={!urlImportValue.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                style={{ background: BRAND_BLUE }}
              >
                <ExternalLink className="w-4 h-4" />
                Import Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100"><Settings className="w-4 h-4 text-gray-600" /></div>
                <h3 className="text-sm font-bold text-gray-900">Settings</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <Settings className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-blue-700 mb-1">Full Settings Panel Coming Soon</p>
                <p className="text-xs text-blue-600">Audio quality, transcription preferences, notifications, and account settings will be available here.</p>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Audio Quality</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">High</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Auto-transcribe</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Dark Mode</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Light</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setShowSettings(false)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAbout(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: BRAND_BLUE }}>
                <AudioWaveform className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">ScreenApp</h3>
              <p className="text-xs text-gray-400 mb-4">Version 1.0.0</p>
              <p className="text-sm text-gray-600 mb-4">AI-powered audio recording, transcription, and summarization for professionals.</p>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <span>Built with</span>
                <span className="text-blue-500 font-medium">React</span>
                <span>+</span>
                <span className="text-blue-500 font-medium">Tailwind</span>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setShowAbout(false)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><Share2 className="w-4 h-4 text-blue-500" /></div>
                <h3 className="text-sm font-bold text-gray-900">Share Recording</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3">Share options coming soon. You can currently download the audio file and share it manually.</p>
              <button
                onClick={() => { handleDownloadAudio(selectedRecording); setShowShareModal(false); showToast('Recording downloaded'); }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ background: BRAND_BLUE }}
              >
                <Download className="w-4 h-4" /> Download & Share
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden"
        onChange={(e) => { e.preventDefault(); showToast('File import — coming soon'); if (e.target) e.target.value = ''; }} />

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

      {/* Toast notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AppPage;