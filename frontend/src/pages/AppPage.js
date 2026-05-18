import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AudioWaveform, Home, Folder, Star, Plus, Search, Settings,
  Mic, Square, Pause, Play, Volume2, Download, Share2,
  ChevronRight, Send, Clock, MoreHorizontal, X, FileText,
  CheckSquare, MessageSquare, Upload, ArrowLeft
} from 'lucide-react';
import { mockRecordings, mockTranscript, mockSummary } from '../data/mock';

const BRAND_BLUE = '#4175F5';
const SPEAKER_COLORS = {
  John: 'text-blue-500', Sarah: 'text-violet-500', Mike: 'text-emerald-500',
  Client: 'text-orange-500', You: 'text-rose-500'
};
const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const AI_RESPONSES = [
  "Based on this recording, I found 3 action items: 1) Review Q3 budget by Wednesday, 2) Schedule design review for Friday, 3) Send proposal to client by end of week.",
  "The main discussion covered: dashboard redesign completion with responsive components, backend API achieving 99% transcription accuracy, and integration timeline for Thursday.",
  "Key decisions made: Release target remains Friday. Friday is buffer for mobile QA. API documentation due before Thursday integration session.",
  "This recording contains 3 unique speakers (John, Sarah, Mike). 9 transcript segments were captured with high confidence."
];

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
        // Use selfBrowserSurface:'exclude' so ScreenApp tab is hidden from the
        // sharing dialog, forcing the user to pick another tab (e.g. YouTube)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: {
            suppressLocalAudioPlayback: false, // keep YouTube audible while recording
          },
          selfBrowserSurface: 'exclude',   // hide THIS tab — user must pick another
          preferCurrentTab: false,          // don't pre-select ScreenApp
          surfaceSwitching: 'include',      // show all open tabs
        });
        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach(t => t.stop());
          alert('No tab audio detected.\n\nIn the Chrome sharing dialog you must:\n1. Click the "Chrome Tab" section\n2. Select the tab playing audio (e.g. YouTube)\n3. ✓ Check "Share tab audio"\n4. Click Share\n\nTry again and follow the steps above.');
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

          {/* Step-by-step guide for Tab Audio */}
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
  const [recordings, setRecordings] = useState(mockRecordings);
  const [showExtension, setShowExtension] = useState(false);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(0);

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

      // Real-time waveform via Web Audio API
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
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings(prev => [{
          id: `r${Date.now()}`,
          title: `Recording – ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          date: 'Just now', duration: formatTime(timerRef.current), speakers: ['You'], audioUrl: url
        }, ...prev]);
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

  const openRecording = (rec) => {
    setSelectedRecording(rec); setView('viewer'); setActiveTab('transcript');
    setChatMessages([{ role: 'ai', content: 'Hi! I can answer questions about this recording. Try "What were the action items?" or "Give me a summary."' }]);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsAITyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'ai', content: AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)] }]);
      setIsAITyping(false);
    }, 900 + Math.random() * 600);
  };

  const handleExtSave = (blob, duration, source) => {
    const url = URL.createObjectURL(blob);
    setRecordings(prev => [{
      id: `r${Date.now()}`,
      title: `${source} – ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: 'Just now', duration: formatTime(duration), speakers: ['You'], audioUrl: url
    }, ...prev]);
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
          {[{ Icon: Home, label: 'Home' }, { Icon: Folder, label: 'My Recordings' }, { Icon: Star, label: 'Favorites' }].map(({ Icon, label }) => (
            <button key={label} onClick={() => setView('dashboard')} className="flex items-center gap-2.5 w-full text-sm py-2 px-3 rounded-lg mb-1 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors duration-150">
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2 tracking-wider">Recent</p>
            {recordings.slice(0, 6).map(rec => (
              <button key={rec.id} onClick={() => openRecording(rec)} className={`flex items-center gap-2 w-full text-xs py-1.5 px-3 rounded-lg mb-0.5 text-left transition-colors duration-150 ${selectedRecording?.id === rec.id && view === 'viewer' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                <Mic className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{rec.title}</span>
              </button>
            ))}
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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
              <p className="text-gray-500 text-sm mb-8">Start a new recording or continue where you left off.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { Icon: Mic, label: 'Record Audio', desc: 'Capture microphone audio', action: startRealRecording, primary: true },
                  { Icon: Upload, label: 'Import File', desc: 'Upload audio or video', action: () => {}, primary: false },
                  { Icon: Share2, label: 'Import URL', desc: 'From Zoom, Meet, YouTube', action: () => {}, primary: false },
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
                {recordings.map(rec => (
                  <button key={rec.id} onClick={() => openRecording(rec)} className="flex items-center gap-4 w-full bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow duration-150 text-left group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rec.audioUrl ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                      <Mic className={`w-5 h-5 ${rec.audioUrl ? 'text-emerald-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                        {rec.title}
                        {rec.audioUrl && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Recorded</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{rec.date} · {rec.duration}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors duration-150 flex-shrink-0" />
                  </button>
                ))}
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
                  <p className="text-xs text-gray-400">{selectedRecording.date} · {selectedRecording.duration}</p>
                </div>
                <div className="flex gap-1">
                  {[Share2, Download, MoreHorizontal].map((Icon, i) => (
                    <button key={i} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-150"><Icon className="w-4 h-4" /></button>
                  ))}
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
                          <div className="text-xs text-gray-400">{selectedRecording.duration}</div>
                        </div>
                      </div>
                      <audio controls src={selectedRecording.audioUrl} className="w-full rounded-lg" style={{ height: 40 }} />
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
                  {['Action Items', 'Key Decisions', 'Follow-ups', 'Export PDF'].map(tag => (
                    <button key={tag} className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-150">{tag}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transcript Panel */}
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
              <div className="flex border-b border-gray-200">
                {[{ id: 'transcript', label: 'Transcript', Icon: FileText }, { id: 'summary', label: 'Summary', Icon: CheckSquare }, { id: 'chat', label: 'Chat', Icon: MessageSquare }].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors duration-150 ${activeTab === id ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {activeTab === 'transcript' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedRecording.audioUrl ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">Transcript Ready</p>
                      <p className="text-xs text-gray-400 mt-1">AI transcription would appear here after processing.</p>
                    </div>
                  ) : (
                    mockTranscript.map((line, i) => (
                      <div key={i} className="group cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors duration-150">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400 w-8">{line.time}</span>
                          <span className={`text-xs font-bold ${SPEAKER_COLORS[line.speaker] || 'text-gray-600'}`}>{line.speaker}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed pl-10">{line.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {[{ title: 'Key Points', items: mockSummary.keyPoints, dot: 'bg-blue-500' }, { title: 'Action Items', items: mockSummary.actionItems, dot: 'bg-emerald-500' }, { title: 'Decisions', items: mockSummary.decisions, dot: 'bg-violet-500' }].map(({ title, items, dot }) => (
                    <div key={title}>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-2 mb-2"><div className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 flex-shrink-0`} /><p className="text-sm text-gray-700 leading-relaxed">{item}</p></div>
                      ))}
                    </div>
                  ))}
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
    </div>
  );
};

export default AppPage;
