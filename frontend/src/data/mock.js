// ScreenApp.io Mock Data

export const testimonials = [
  { id: 1, name: "Aaron", role: "Project Manager", rating: 5, text: "Our overall experience with ScreenApp has been nothing but pleasant! Their support is terrific, and ScreenApp is a great recording system.", initials: "A", bg: "bg-blue-100", color: "text-blue-700" },
  { id: 2, name: "JP", role: "Operations Manager", rating: 5, text: "Finally, a screen recorder that doesn't slap watermarks on everything. The free plan gives me 45 minutes of AI processing monthly — that's enough for most training videos.", initials: "JP", bg: "bg-violet-100", color: "text-violet-700" },
  { id: 3, name: "Trina", role: "Founder", rating: 5, text: "I was skeptical about another AI notetaker, but ScreenApp's generous free tier completely won me over. Professional-grade quality and AI features that actually work.", initials: "T", bg: "bg-emerald-100", color: "text-emerald-700" },
  { id: 4, name: "Kelvin", role: "Software Engineer", rating: 5, text: "The desktop and mobile apps are fantastic. Recording meetings while I'm mobile has never been easier, and the dictation feature is a huge time-saver.", initials: "K", bg: "bg-orange-100", color: "text-orange-700" },
  { id: 5, name: "Millie", role: "Director", rating: 5, text: "Our team was drowning in client feedback until we found ScreenApp. Now we record every presentation and client call, and the AI summaries are spot-on.", initials: "M", bg: "bg-pink-100", color: "text-pink-700" },
  { id: 6, name: "Tanmay", role: "Marketing Guru", rating: 5, text: "Makes recording and sharing guides effortless. Capture my screen and instantly turn it into step-by-step guides in any format. Smart, simple, brilliant use of AI.", initials: "TM", bg: "bg-teal-100", color: "text-teal-700" },
  { id: 7, name: "Sav", role: "Project Manager", rating: 5, text: "Web-based platform that requires no installation. Start recording in seconds, not minutes. Users consistently love the simplicity and reliability.", initials: "S", bg: "bg-indigo-100", color: "text-indigo-700" },
  { id: 8, name: "Nate", role: "Video Creator", rating: 5, text: "The ability to automatically transcribe and summarize recordings is a major time-saver, turning video content into searchable, useful data.", initials: "N", bg: "bg-amber-100", color: "text-amber-700" }
];

export const faqs = [
  { q: "How does the AI Notetaker work?", a: "ScreenApp automatically captures, transcribes, and transforms your conversations into structured notes with key points, action items, and decisions - all in real-time." },
  { q: "What makes the AI Summarizer different?", a: "Our AI extracts the most important insights from hours of content in seconds. Get executive summaries, key decisions, and action items without watching entire recordings." },
  { q: "How accurate is the transcription and summarization?", a: "ScreenApp delivers up to 99% transcription accuracy with clear audio. Summaries capture key points, action items, and decisions with high precision." },
  { q: "Do I need to install anything?", a: "No. You can use ScreenApp directly in your browser. Optionally, install our mobile app or Chrome extension for extended functionality." },
  { q: "Can I use ScreenApp for dictation and document creation?", a: "Yes. Convert any audio or video recording into formatted documents, PDFs, or text files. Perfect for meeting minutes, interview transcripts, and professional reports." },
  { q: "Can I import from Zoom, Google Meet, or YouTube?", a: "Yes. Upload recordings from any platform, import directly via URL, or use our meeting bots to automatically capture sessions. Works with all major video conferencing tools." },
  { q: "Is my data secure?", a: "Yes. All recordings and transcripts are encrypted during transfer and storage. SOC 2 Type II certified and GDPR compliant. You control who can access your content." },
  { q: "What's included in the free plan?", a: "The free plan includes 3 recordings, limited transcription minutes, basic AI summaries, and core recording and upload features. No credit card required." }
];

export const pricingPlans = [
  {
    id: "free", name: "Free", monthlyPrice: 0, yearlyPrice: 0,
    description: "Start here, upgrade when ready",
    features: ["3 recordings", "Try AI summaries, chat, templates", "Full transcript included"],
    cta: "Try Now", note: "No card required. Seriously.", popular: false
  },
  {
    id: "growth", name: "Growth", monthlyPrice: 23, yearlyPrice: 19,
    description: "Start with 7-day free trial",
    features: ["600 AI credits/year", "Unlimited recordings", "Meeting bot included", "Download & export everything"],
    cta: "Start Free Trial", note: "7 days free, then $228/year", popular: true
  },
  {
    id: "business", name: "Business", monthlyPrice: 41, yearlyPrice: 34,
    description: "Unlimited. For power users",
    features: ["Unlimited AI credits", "Unlimited transcriptions", "Video analysis", "API access", "White label"],
    cta: "Go All In", note: "", popular: false
  }
];

export const comparisonFeatures = [
  { category: "Recording", features: [
    { name: "Total Recordings", free: "3 files", growth: "Unlimited", business: "Unlimited" },
    { name: "Upload Files", free: false, growth: true, business: true },
    { name: "Import from URL", free: false, growth: true, business: true },
  ]},
  { category: "AI Capabilities", features: [
    { name: "AI Summaries & Notes", free: true, growth: true, business: true },
    { name: "Chat with Recordings", free: true, growth: true, business: true },
    { name: "Templates & Action Items", free: true, growth: true, business: true },
    { name: "Ask AI Across Files", free: false, growth: true, business: true },
    { name: "Translate (100+ languages)", free: true, growth: true, business: true },
    { name: "Video Analysis", free: false, growth: "36/year", business: "120/year" },
  ]},
  { category: "Export & Share", features: [
    { name: "Download Video/Audio", free: false, growth: true, business: true },
    { name: "Export to PDF", free: false, growth: true, business: true },
    { name: "Search Everything", free: true, growth: true, business: true },
  ]},
  { category: "Team & Power Features", features: [
    { name: "Meeting Bot", free: false, growth: true, business: true },
    { name: "API Access", free: false, growth: false, business: true },
    { name: "White Label", free: false, growth: false, business: true },
    { name: "Custom Vocabulary", free: false, growth: false, business: true },
  ]}
];

export const bentoItems = [
  { title: "AI That Actually Listens", bg: "from-blue-500 to-blue-700", icon: "Mic2", desc: "Real-time transcription" },
  { title: "Record Audio Instantly", bg: "from-violet-500 to-violet-700", icon: "CircleDot", desc: "One-click recording" },
  { title: "Summarize Hours Instantly", bg: "from-emerald-500 to-emerald-700", icon: "FileText", desc: "AI summaries in seconds" },
  { title: "Get Answers Fast", bg: "from-amber-400 to-orange-500", icon: "MessageSquare", desc: "Chat with your recordings" },
  { title: "Import From Anywhere", bg: "from-rose-500 to-pink-600", icon: "Upload", desc: "Zoom, Meet, YouTube" },
  { title: "Get Smart Meeting Minutes", bg: "from-indigo-500 to-indigo-700", icon: "CalendarDays", desc: "Auto-generated notes" },
  { title: "Sync Instantly to Computer", bg: "from-teal-500 to-teal-700", icon: "RefreshCw", desc: "Cross-device sync" },
  { title: "Your Second Brain · 1M+ Users", bg: "from-slate-700 to-slate-900", icon: "Lightbulb", desc: "AI knowledge base" }
];

export const featureBlocks = [
  { id: 1, title: "Intelligence as it Happens", desc: "Record and transcribe meetings, lectures, and conversations. Let AI listen for you.", tag: "TRANSCRIPTION", color: "blue" },
  { id: 2, title: "Search everything you've said", desc: "Ask questions, get answers from all your recordings instantly.", tag: "AI SEARCH", color: "purple" },
  { id: 3, title: "Analyze video frames", desc: "Find any moment in your audio and video recordings.", tag: "VIDEO AI", color: "teal" },
  { id: 4, title: "Write faster", desc: "Clean up messy text in seconds with AI editing assistance.", tag: "DICTATION", color: "orange" },
  { id: 5, title: "No Missed Details", desc: "Capture and transcribe everything you say automatically.", tag: "TRANSCRIPTION", color: "green" },
  { id: 6, title: "Your Second Brain", desc: "Ask questions and get instant answers on everything you've recorded.", tag: "AI CHAT", color: "indigo" },
  { id: 7, title: "Generate Professional PDF", desc: "Export writing content and screenshots into beautiful PDF documents.", tag: "EXPORT", color: "rose" },
  { id: 8, title: "Translate anything", desc: "Translate any recording in real time, on Web and Android.", tag: "TRANSLATE", color: "amber" },
  { id: 9, title: "Find anything, anywhere", desc: "Search meetings, recordings, and conversations instantly.", tag: "SEARCH", color: "cyan" }
];

export const mockRecordings = [
  { id: "r1", title: "Team Standup - Q3 Planning", date: "Today, 9:30 AM", duration: "12:34", speakers: ["John", "Sarah", "Mike"] },
  { id: "r2", title: "Client Presentation - Product Demo", date: "Yesterday, 2:15 PM", duration: "45:22", speakers: ["You", "Client"] },
  { id: "r3", title: "Product Review Meeting", date: "Dec 12, 11:00 AM", duration: "28:45", speakers: ["Team"] },
  { id: "r4", title: "Design Critique Session", date: "Dec 11, 3:00 PM", duration: "32:10", speakers: ["Design Team"] },
  { id: "r5", title: "Sales Call - Enterprise Lead", date: "Dec 10, 1:30 PM", duration: "18:55", speakers: ["You"] }
];

export const mockTranscript = [
  { time: "0:00", speaker: "John", text: "Good morning everyone. Let's get started with today's standup." },
  { time: "0:15", speaker: "Sarah", text: "I finished the dashboard redesign. All the components are now responsive and dark mode is working correctly." },
  { time: "0:42", speaker: "Mike", text: "Great work Sarah. The backend API for the transcription service is now achieving 99% accuracy on clean audio." },
  { time: "1:10", speaker: "John", text: "That's fantastic. Any blockers we should know about before our release on Friday?" },
  { time: "1:18", speaker: "Sarah", text: "The design system needs a few tweaks but nothing is blocking the release timeline." },
  { time: "1:35", speaker: "Mike", text: "Same from my end. The API is ready for frontend integration today." },
  { time: "1:55", speaker: "John", text: "Perfect. Let's plan to have the integration done by Thursday. Any questions from the team?" },
  { time: "2:10", speaker: "Sarah", text: "Will we need additional QA testing time for the mobile version?" },
  { time: "2:20", speaker: "John", text: "We have Friday as buffer. Should be sufficient for the scope we've defined." }
];

export const mockSummary = {
  keyPoints: [
    "Dashboard redesign complete with responsive components and dark mode",
    "Backend API achieving 99% transcription accuracy",
    "Integration planned for Thursday, release Friday"
  ],
  actionItems: [
    "Sarah: Minor design system tweaks by Wednesday",
    "Mike: Provide API documentation for frontend team",
    "John: Schedule QA session for Thursday afternoon"
  ],
  decisions: [
    "Release target remains Friday",
    "Friday reserved as buffer time for mobile QA"
  ]
};

export const trustedCompanies = ["Antler", "Tesla", "Atlassian", "Odoo", "Deel", "Salesforce", "Netflix"];
