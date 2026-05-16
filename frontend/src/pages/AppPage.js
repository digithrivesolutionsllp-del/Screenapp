import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  "This recording is 12:34 minutes with 3 unique speakers (John, Sarah, Mike). 9 transcript segments captured with high confidence scoring."
];

const RecordingWaveform = ({ isActive }) => {
  const [heights, setHeights] = useState(Array(28).fill(20));

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setHeights(Array(28).fill(0).map(() => Math.random() * 56 + 8));
    }, 150);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full"
          style={{
            height: h,
            background: isActive ? BRAND_BLUE : '#E5E7EB',
            transition: 'height 0.15s ease'
          }}
        />
      ))}
    </div>
  );
};

const ChromeExtensionPopup = ({ onClose }) => (
  <div className="fixed bottom-6 right-6 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
    <div className="p-3 flex items-center justify-between border-b border-gray-100" style={{ background: BRAND_BLUE }}>
      <div className="flex items-center gap-2">
        <AudioWaveform className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">ScreenApp</span>
        <span className="text-white/70 text-xs">Extension</span>
      </div>
      <button onClick={onClose} className="text-white/70 hover:text-white transition-colors duration-150"><X className="w-4 h-4" /></button>
    </div>
    <div className="p-4">
      <p className="text-xs text-gray-500 mb-3">Capture audio from this tab and transcribe with AI</p>
      <div className="space-y-2 mb-4">
        {[
          { label: 'Microphone', checked: true },
          { label: 'Tab Audio', checked: false },
          { label: 'Auto-transcribe', checked: true }
        ].map(({ label, checked }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            <div className={`w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer ${checked ? '' : 'bg-gray-200'}`} style={checked ? { background: BRAND_BLUE } : {}}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-150 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        ))}
      </div>
      <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity duration-150" style={{ background: BRAND_BLUE }}>
        <Mic className="w-4 h-4" /> Start Recording
      </button>
    </div>
  </div>
);

const AppPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState('transcript');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: 'Hi! I can answer questions about this recording. Try "What were the action items?" or "Give me a summary."' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [recordings, setRecordings] = useState(mockRecordings);
  const [showExtension, setShowExtension] = useState(false);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = () => {
    setIsRecording(true); setIsPaused(false);
    setRecordingTime(0); setView('recorder');
  };

  const stopRecording = () => {
    const newRec = {
      id: `r${Date.now()}`,
      title: `New Recording – ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: 'Just now',
      duration: formatTime(recordingTime),
      speakers: ['You']
    };
    setRecordings(prev => [newRec, ...prev]);
    setIsRecording(false); setView('dashboard'); setRecordingTime(0);
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BRAND_BLUE }}>
              <AudioWaveform className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ScreenApp</span>
          </button>
        </div>

        <div className="p-3 flex-1">
          <button onClick={startRecording} className="flex items-center gap-2 w-full text-white text-sm font-semibold py-2.5 px-3 rounded-xl hover:opacity-90 transition-opacity duration-150 mb-4" style={{ background: BRAND_BLUE }}>
            <Plus className="w-4 h-4" /> New Recording
          </button>
          {[
            { Icon: Home, label: 'Home' },
            { Icon: Folder, label: 'My Recordings' },
            { Icon: Star, label: 'Favorites' },
          ].map(({ Icon, label }) => (
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
          <button onClick={() => setShowExtension(!showExtension)} className="flex items-center gap-2.5 w-full text-sm text-gray-400 hover:text-white py-2 px-3 rounded-lg transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer" style={{ background: BRAND_BLUE }}>U</div>
          </div>
        </div>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
              <p className="text-gray-500 text-sm mb-8">Start a new recording or continue where you left off.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { Icon: Mic, label: 'Record Audio', desc: 'Capture microphone audio', action: startRecording, primary: true },
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
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Mic className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{rec.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{rec.date} · {rec.duration}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors duration-150 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recorder View */}
        {view === 'recorder' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-12 shadow-lg max-w-md w-full text-center border border-gray-100">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full bg-red-500 ${!isPaused ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-semibold text-gray-700">{isPaused ? 'PAUSED' : 'RECORDING'}</span>
              </div>
              <div className="text-5xl font-mono font-bold text-gray-900 mb-6">{formatTime(recordingTime)}</div>
              <RecordingWaveform isActive={isRecording && !isPaused} />
              <p className="text-sm text-gray-400 mt-4 mb-8">Speak now — AI is listening and transcribing in real-time</p>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setIsPaused(!isPaused)} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors duration-150">
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                <button onClick={stopRecording} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors duration-150 shadow-lg">
                  <Square className="w-6 h-6 fill-white" />
                </button>
                <button onClick={() => { setIsRecording(false); setView('dashboard'); setRecordingTime(0); }} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors duration-150">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-5">Press ■ to stop and save · Press ✕ to discard</p>
            </div>
          </div>
        )}

        {/* Viewer View */}
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
                  <div className="w-full bg-gray-700 rounded-full h-1 cursor-pointer">
                    <div className="h-1 rounded-full" style={{ width: '20%', background: BRAND_BLUE }} />
                  </div>
                </div>
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
                {[
                  { id: 'transcript', label: 'Transcript', Icon: FileText },
                  { id: 'summary', label: 'Summary', Icon: CheckSquare },
                  { id: 'chat', label: 'Chat', Icon: MessageSquare }
                ].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors duration-150 ${activeTab === id ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {activeTab === 'transcript' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {mockTranscript.map((line, i) => (
                    <div key={i} className="group cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors duration-150">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400 w-8">{line.time}</span>
                        <span className={`text-xs font-bold ${SPEAKER_COLORS[line.speaker] || 'text-gray-600'}`}>{line.speaker}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed pl-10">{line.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {[
                    { title: 'Key Points', items: mockSummary.keyPoints, dot: 'bg-blue-500' },
                    { title: 'Action Items', items: mockSummary.actionItems, dot: 'bg-emerald-500' },
                    { title: 'Decisions', items: mockSummary.decisions, dot: 'bg-violet-500' }
                  ].map(({ title, items, dot }) => (
                    <div key={title}>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 flex-shrink-0`} />
                          <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                        </div>
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
                        <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                          style={msg.role === 'user' ? { background: BRAND_BLUE } : {}}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isAITyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-3 py-2 flex gap-1 items-center">
                          {[0, 0.15, 0.3].map(d => (
                            <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChat()}
                        placeholder="Ask about this recording..."
                        className="flex-1 text-sm bg-gray-50 rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-blue-400 transition-colors duration-150 placeholder-gray-400"
                      />
                      <button
                        onClick={sendChat}
                        disabled={!chatInput.trim()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity duration-150"
                        style={{ background: BRAND_BLUE }}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showExtension && <ChromeExtensionPopup onClose={() => setShowExtension(false)} />}
    </div>
  );
};

export default AppPage;
