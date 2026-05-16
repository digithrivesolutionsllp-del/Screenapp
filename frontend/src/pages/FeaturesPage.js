import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, Monitor, Zap, Bot, Globe, Video,
  Check, ArrowRight, Play, Upload, Download, Users, Clock, Search
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const BRAND_BLUE = '#4175F5';

const ALL_FEATURES = [
  { id: 'transcription', label: 'AI Transcription', icon: FileText, color: 'blue', accentBg: 'bg-blue-50', accentText: 'text-blue-600', accentBorder: 'border-blue-200' },
  { id: 'screen-recorder', label: 'Screen Recorder', icon: Monitor, color: 'violet', accentBg: 'bg-violet-50', accentText: 'text-violet-600', accentBorder: 'border-violet-200' },
  { id: 'ai-summarizer', label: 'AI Summarizer', icon: Zap, color: 'emerald', accentBg: 'bg-emerald-50', accentText: 'text-emerald-600', accentBorder: 'border-emerald-200' },
  { id: 'meeting-bot', label: 'Meeting Bot', icon: Bot, color: 'orange', accentBg: 'bg-orange-50', accentText: 'text-orange-600', accentBorder: 'border-orange-200' },
  { id: 'audio-translator', label: 'Audio Translator', icon: Globe, color: 'teal', accentBg: 'bg-teal-50', accentText: 'text-teal-600', accentBorder: 'border-teal-200' },
  { id: 'video-analyzer', label: 'Video Analyzer', icon: Video, color: 'rose', accentBg: 'bg-rose-50', accentText: 'text-rose-600', accentBorder: 'border-rose-200' },
];

const FEATURES_DATA = {
  transcription: {
    title: 'AI Transcription',
    tagline: 'Up to 99% accurate. Real-time. 100+ languages.',
    description: 'Transform any audio or video into precise text instantly. ScreenApp\'s AI transcription handles multiple speakers, background noise, and 100+ languages with industry-leading accuracy.',
    icon: FileText, accentBg: 'bg-blue-50', accentText: 'text-blue-600',
    benefits: [
      { icon: Check, title: 'Up to 99% Accuracy', desc: 'Industry-leading transcription with clear audio input, even with accents and multiple speakers.' },
      { icon: Users, title: 'Speaker Identification', desc: 'Automatically identifies and labels each unique speaker in your recording.' },
      { icon: Globe, title: '100+ Languages', desc: 'Transcribe and translate in over 100 languages with automatic language detection.' },
      { icon: Download, title: 'Export Anywhere', desc: 'Download as TXT, SRT, VTT, Word, or PDF with a single click.' },
    ],
    steps: [
      { num: '01', title: 'Upload or Record', desc: 'Upload any audio/video file or record directly in your browser. Supports MP3, MP4, WAV, M4A, WebM and more.' },
      { num: '02', title: 'AI Transcribes Instantly', desc: 'Our AI processes your audio and generates accurate text with timestamps and speaker labels in seconds.' },
      { num: '03', title: 'Edit & Export', desc: 'Review, correct, and export your transcript in any format. Share via link or download for offline use.' },
    ]
  },
  'screen-recorder': {
    title: 'Screen Recorder',
    tagline: 'Record anything. No watermarks. No installs.',
    description: 'Professional-grade screen recording directly in your browser. Capture your screen, webcam, or both simultaneously with crystal-clear HD quality.',
    icon: Monitor, accentBg: 'bg-violet-50', accentText: 'text-violet-600',
    benefits: [
      { icon: Monitor, title: 'HD Screen Recording', desc: 'Record in up to 1080p with crisp visuals, perfect for tutorials and demos.' },
      { icon: Check, title: 'No Watermarks', desc: 'Even the free plan includes watermark-free recordings for professional use.' },
      { icon: Upload, title: 'Instant Sharing', desc: 'Share via link instantly after recording — no uploading required.' },
      { icon: Zap, title: 'No Installation', desc: 'Fully browser-based. Start recording in seconds without downloading anything.' },
    ],
    steps: [
      { num: '01', title: 'Choose Your Source', desc: 'Select screen, application window, or browser tab. Add webcam overlay and microphone audio.' },
      { num: '02', title: 'Record & Annotate', desc: 'Record in HD with system audio, microphone, or both. Draw, highlight, and annotate in real-time.' },
      { num: '03', title: 'Share Instantly', desc: 'Recording is immediately available for sharing. Download or generate a shareable link.' },
    ]
  },
  'ai-summarizer': {
    title: 'AI Summarizer',
    tagline: 'Turn hours of content into seconds of insight.',
    description: 'Skip the watching. Our AI extracts the most important insights, decisions, and action items from any recording — automatically and accurately.',
    icon: Zap, accentBg: 'bg-emerald-50', accentText: 'text-emerald-600',
    benefits: [
      { icon: Zap, title: 'Executive Summaries', desc: 'Get a concise summary of key topics and decisions in bullet-point format.' },
      { icon: Check, title: 'Action Item Extraction', desc: 'AI identifies and lists all action items, owners, and deadlines mentioned.' },
      { icon: FileText, title: 'Auto-Chapters', desc: 'Long recordings are automatically divided into chapters with topic headings.' },
      { icon: Download, title: 'Export as PDF/Doc', desc: 'Export polished meeting minutes or reports with one click.' },
    ],
    steps: [
      { num: '01', title: 'Transcribe Your Recording', desc: 'Upload or record audio/video — ScreenApp transcribes everything with high accuracy.' },
      { num: '02', title: 'AI Analyzes & Summarizes', desc: 'Our AI identifies key points, decisions, action items, and generates structured summaries.' },
      { num: '03', title: 'Use Your Summary', desc: 'Share summaries with your team, export as PDF, or ask follow-up questions via AI Chat.' },
    ]
  },
  'meeting-bot': {
    title: 'Meeting Bot',
    tagline: 'Never miss a word from Zoom, Meet, or Teams.',
    description: 'Add ScreenApp\'s AI bot to any meeting and it automatically joins, records, transcribes, and summarizes — so you can stay focused on the conversation.',
    icon: Bot, accentBg: 'bg-orange-50', accentText: 'text-orange-600',
    benefits: [
      { icon: Bot, title: 'Auto-join Meetings', desc: 'Bot joins Zoom, Google Meet, Microsoft Teams, and Webex automatically.' },
      { icon: Check, title: 'Full Transcription', desc: 'Every word is captured with speaker labels and timestamps in real-time.' },
      { icon: Zap, title: 'Instant Summary', desc: 'Summaries, action items, and decisions are ready the moment the meeting ends.' },
      { icon: Users, title: 'Team Sharing', desc: 'Auto-share notes with your team via email, Slack, or Notion integration.' },
    ],
    steps: [
      { num: '01', title: 'Connect Your Calendar', desc: 'Link Google or Outlook calendar. ScreenApp detects upcoming meetings automatically.' },
      { num: '02', title: 'Bot Joins & Records', desc: 'The AI bot joins as a participant, records everything, and transcribes in real-time.' },
      { num: '03', title: 'Get Notes Instantly', desc: 'Receive a full summary, transcript, and action items immediately after the meeting ends.' },
    ]
  },
  'audio-translator': {
    title: 'Audio Translator',
    tagline: 'Break language barriers in any recording.',
    description: 'Translate transcripts and audio content into 100+ languages with AI precision. Perfect for global teams, international meetings, and multilingual content.',
    icon: Globe, accentBg: 'bg-teal-50', accentText: 'text-teal-600',
    benefits: [
      { icon: Globe, title: '100+ Languages', desc: 'Translate to and from over 100 languages with high accuracy AI models.' },
      { icon: Clock, title: 'Real-time Translation', desc: 'See translated text appear alongside the original in real-time as you play.' },
      { icon: FileText, title: 'Preserve Formatting', desc: 'Translated transcripts retain speaker labels, timestamps, and paragraph structure.' },
      { icon: Download, title: 'Export Translated SRT', desc: 'Download translated subtitles in SRT or VTT format for videos.' },
    ],
    steps: [
      { num: '01', title: 'Upload or Record', desc: 'Add any audio or video content in any language. ScreenApp auto-detects the source language.' },
      { num: '02', title: 'Select Target Language', desc: 'Choose one or multiple target languages from our 100+ language library.' },
      { num: '03', title: 'Get Translated Transcript', desc: 'Receive a side-by-side original and translated transcript. Export as subtitle file or document.' },
    ]
  },
  'video-analyzer': {
    title: 'Video Analyzer',
    tagline: 'AI that watches your videos so you don\'t have to.',
    description: 'Find any moment, face, or topic across all your videos with visual AI analysis. Skip to the exact frame you need in seconds, no scrubbing required.',
    icon: Video, accentBg: 'bg-rose-50', accentText: 'text-rose-600',
    benefits: [
      { icon: Search, title: 'Visual Search', desc: 'Search for faces, objects, or on-screen text across all your videos.' },
      { icon: Play, title: 'Smart Chapters', desc: 'AI auto-generates chapters and highlights based on content and topics.' },
      { icon: Zap, title: 'Frame Analysis', desc: 'Extract text from slides, whiteboards, and screens shown in your recordings.' },
      { icon: Clock, title: 'Jump to Any Moment', desc: 'Click any search result to jump directly to that timestamp.' },
    ],
    steps: [
      { num: '01', title: 'Upload Your Video', desc: 'Upload any video file. ScreenApp processes both the audio and video frames.' },
      { num: '02', title: 'AI Analyzes Every Frame', desc: 'Visual AI scans for faces, text, objects, and scene changes throughout the video.' },
      { num: '03', title: 'Search & Navigate', desc: 'Use the visual search to jump to any moment, face, or topic instantly.' },
    ]
  }
};

const FeaturesHub = () => {
  const navigate = useNavigate();
  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Everything you need to capture, understand, and share</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">AI-powered tools for recording, transcription, summarization, and more.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ALL_FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <Link to={`/features/${f.id}`} key={f.id} className={`${f.accentBg} border ${f.accentBorder} rounded-2xl p-6 hover:shadow-md transition-shadow duration-200 group`}>
                <div className={`w-10 h-10 rounded-xl ${f.accentBg} border ${f.accentBorder} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${f.accentText}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{FEATURES_DATA[f.id]?.tagline}</p>
                <div className={`flex items-center gap-1 mt-4 text-xs font-semibold ${f.accentText} group-hover:gap-2 transition-all duration-150`}>
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const FeatureDetail = ({ data, featureId }) => {
  const navigate = useNavigate();
  const Icon = data.icon;
  const featureMeta = ALL_FEATURES.find(f => f.id === featureId);

  return (
    <div>
      {/* Hero */}
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`inline-flex items-center gap-2 ${data.accentBg} ${data.accentText} text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-6`}>
            <Icon className="w-3.5 h-3.5" /> {featureMeta?.label || data.title}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">{data.title}</h1>
          <p className={`text-xl font-medium ${data.accentText} mb-4`}>{data.tagline}</p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">{data.description}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity duration-150" style={{ background: BRAND_BLUE }}>
              Try {data.title} Free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">Why ScreenApp {data.title}?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${data.accentBg} flex items-center justify-center mb-4`}>
                    <BIcon className={`w-5 h-5 ${data.accentText}`} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className={`w-12 h-12 rounded-2xl ${data.accentBg} flex items-center justify-center mx-auto mb-4 text-xl font-black ${data.accentText}`}>
                  {s.num}
                </div>
                {i < data.steps.length - 1 && (
                  <div className="hidden md:block absolute mt-6 ml-full w-12 h-0.5 bg-gray-200" />
                )}
                <h3 className="text-base font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other features */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Explore more features</h2>
          <div className="flex flex-wrap gap-3">
            {ALL_FEATURES.filter(f => f.id !== featureId).map(f => {
              const FIcon = f.icon;
              return (
                <Link key={f.id} to={`/features/${f.id}`} className={`flex items-center gap-2 ${f.accentBg} border ${f.accentBorder} px-4 py-2 rounded-full text-sm font-medium ${f.accentText} hover:shadow-sm transition-shadow duration-150`}>
                  <FIcon className="w-4 h-4" /> {f.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center bg-gray-900">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to try {data.title}?</h2>
          <p className="text-gray-400 mb-8">Start free — no credit card required.</p>
          <button onClick={() => navigate('/app')} className="text-gray-900 bg-white font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100 transition-colors duration-150">
            Start Free Today
          </button>
        </div>
      </section>
    </div>
  );
};

const FeaturesPage = () => {
  const { featureId } = useParams();
  const featureData = featureId ? FEATURES_DATA[featureId] : null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {featureData ? <FeatureDetail data={featureData} featureId={featureId} /> : <FeaturesHub />}
      <Footer />
    </div>
  );
};

export default FeaturesPage;
