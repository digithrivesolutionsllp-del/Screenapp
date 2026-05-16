import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Star, Check, AudioWaveform,
  Mic2, CircleDot, FileText, MessageSquare, Upload,
  CalendarDays, RefreshCw, Lightbulb
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  testimonials, faqs, bentoItems, featureBlocks, trustedCompanies
} from '../data/mock';

const BRAND_BLUE = '#4175F5';
const ICON_MAP = { Mic2, CircleDot, FileText, MessageSquare, Upload, CalendarDays, RefreshCw, Lightbulb };

const colorBg = {
  blue: 'bg-blue-50', purple: 'bg-violet-50', teal: 'bg-teal-50',
  orange: 'bg-orange-50', green: 'bg-emerald-50', indigo: 'bg-indigo-50',
  rose: 'bg-rose-50', amber: 'bg-amber-50', cyan: 'bg-cyan-50'
};
const colorTag = {
  blue: 'text-blue-600', purple: 'text-violet-600', teal: 'text-teal-600',
  orange: 'text-orange-600', green: 'text-emerald-600', indigo: 'text-indigo-600',
  rose: 'text-rose-600', amber: 'text-amber-600', cyan: 'text-cyan-600'
};

const FeatureMockUI = ({ id }) => {
  const mocks = {
    1: <div className="bg-white rounded-lg p-3 shadow-sm text-xs">
      <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-gray-500">Recording • 00:23</span></div>
      <div className="space-y-1.5">
        <div className="flex gap-2"><span className="font-semibold text-blue-600">John:</span><span className="text-gray-700">Let's review the Q3 results</span></div>
        <div className="flex gap-2"><span className="font-semibold text-violet-600">Sarah:</span><span className="text-gray-700">Dashboard is ready for demo</span></div>
        <div className="bg-yellow-50 border border-yellow-100 rounded px-2 py-1 text-yellow-700 mt-1">Action item detected</div>
      </div>
    </div>,
    2: <div className="bg-white rounded-lg p-3 shadow-sm text-xs">
      <div className="flex items-center gap-2 mb-2 bg-gray-50 rounded px-2 py-1.5"><span className="text-gray-400">⌕</span><span className="text-gray-500">budget approval...</span></div>
      <div className="space-y-1">
        <div className="text-gray-400 mb-1">3 results found</div>
        {["Q3 Review · 2 min ago", "Team Standup · 1 day ago", "Client Call · 3 days ago"].map(r => (
          <div key={r} className="flex items-center gap-2 py-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /><span className="text-gray-700">{r}</span></div>
        ))}
      </div>
    </div>,
    3: <div className="bg-white rounded-lg p-3 shadow-sm text-xs">
      <div className="bg-gray-900 rounded-md h-14 flex items-center justify-center mb-2 relative overflow-hidden">
        <span className="text-gray-400">▶ 2:34 / 12:45</span>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700"><div className="h-full bg-blue-500 w-1/4" /></div>
      </div>
      <div className="flex gap-0.5 mb-1">{[3,5,4,7,3,6,4,5,3,6,4,5].map((h,i)=><div key={i} className="flex-1 bg-blue-200 rounded-sm" style={{height:h*3}}/>)}</div>
      <div className="text-gray-500">AI found 4 key moments</div>
    </div>,
    4: <div className="bg-white rounded-lg p-3 shadow-sm text-xs">
      <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-gray-500">Dictation active</span></div>
      <div className="space-y-1">
        <div className="text-gray-600">thursday → <span className="text-green-700 font-medium">Thursday</span></div>
        <div className="text-gray-600">the the budget → <span className="text-green-700 font-medium">the budget</span></div>
      </div>
    </div>,
    5: <div className="bg-white rounded-lg p-3 shadow-sm text-xs space-y-1.5">
      {[{t:"0:00",s:"John",c:"text-blue-600"},{t:"0:15",s:"Sarah",c:"text-violet-600"},{t:"0:42",s:"Mike",c:"text-emerald-600"}].map(({t,s,c})=>(
        <div key={t} className="flex gap-2 items-start">
          <span className="text-gray-400 w-8 flex-shrink-0">{t}</span>
          <span className={`font-semibold ${c} w-10 flex-shrink-0`}>{s}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full mt-0.5" />
        </div>
      ))}
    </div>,
    6: <div className="bg-white rounded-lg p-3 shadow-sm text-xs space-y-2">
      <div className="bg-gray-50 rounded px-2 py-1.5 text-gray-700">What were the action items?</div>
      <div className="bg-blue-50 rounded px-2 py-1.5 text-blue-800">Found 3 items: Review Q3 budget, Schedule design review, Send proposal by Friday.</div>
    </div>,
    7: <div className="bg-white rounded-lg p-3 shadow-sm text-xs">
      <div className="border border-gray-200 rounded p-2">
        <div className="font-semibold text-gray-800 mb-1">Meeting Minutes</div>
        <div className="text-gray-400 mb-1">December 12, 2024</div>
        <div className="h-1.5 bg-gray-100 rounded mb-1" /><div className="h-1.5 bg-gray-100 rounded mb-1 w-3/4" /><div className="h-1.5 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="flex items-center gap-1 mt-2 text-rose-500"><FileText className="w-3 h-3" /><span>Export as PDF</span></div>
    </div>,
    8: <div className="bg-white rounded-lg p-3 shadow-sm text-xs">
      <div className="flex items-center gap-2 mb-2"><span className="font-medium text-gray-600">EN</span><ArrowRight className="w-3 h-3 text-gray-400" /><span className="font-medium text-blue-600">ES</span></div>
      <div className="text-gray-500 mb-1">Good morning everyone</div>
      <div className="text-blue-700 font-medium">Buenos días a todos</div>
    </div>,
    9: <div className="bg-white rounded-lg p-3 shadow-sm text-xs space-y-1.5">
      {["All recordings","This week","Client calls","Team standups"].map(t=>(
        <div key={t} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /><span className="text-gray-700">{t}</span><span className="ml-auto text-gray-400">12</span></div>
      ))}
    </div>
  };
  return mocks[id] || null;
};

const ChromeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="white" stroke="#e5e7eb" strokeWidth="2"/>
    <path d="M50 50 L50 8 A42 42 0 0 1 86.4 29 Z" fill="#EA4335"/>
    <path d="M50 50 L86.4 29 A42 42 0 0 1 86.4 71 Z" fill="#FBBC05"/>
    <path d="M50 50 L86.4 71 A42 42 0 0 1 13.6 71 Z" fill="#34A853"/>
    <path d="M50 50 L13.6 71 A42 42 0 0 1 13.6 29 Z" fill="#4285F4"/>
    <circle cx="50" cy="50" r="20" fill="white"/>
    <circle cx="50" cy="50" r="14" fill="#4285F4"/>
  </svg>
);

const HomePage = () => {
  const navigate = useNavigate();
  const avatarColors = ['#4175F5', '#7C3AED', '#10B981'];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Announcement Banner - shown inside Navbar component */}

      {/* Hero */}
      <section className="pt-36 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6" style={{background:'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #4175F5 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>
            Your Window Into Your Recordings
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Absorb your meetings in five seconds. Turn scattered conversations into structured knowledge. Stop watching. Start understanding.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-base font-semibold text-white px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity duration-150" style={{background: BRAND_BLUE}}>
              Start Free <ArrowRight className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2.5 text-base font-semibold text-gray-800 bg-white border border-gray-200 px-8 py-3.5 rounded-full hover:bg-gray-50 transition-colors duration-150"
              onClick={() => navigate('/app', { state: { openExtension: true } })}>
              <ChromeIcon /> Add to Chrome
            </button>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['A','J','S'].map((l,i)=><div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white" style={{background:avatarColors[i]}}>{l}</div>)}
            </div>
            <span className="text-sm text-gray-500">Loved by over <strong className="text-gray-900">3 million people</strong></span>
          </div>
        </div>
      </section>

      {/* App Preview Mockup */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4 bg-white rounded-md px-4 py-1 text-xs text-gray-400 text-center">app.screenapp.io</div>
            </div>
            <div className="flex" style={{height:420}}>
              <div className="w-52 bg-gray-50 border-r border-gray-200 p-3 flex flex-col gap-1 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{background:BRAND_BLUE}}><AudioWaveform className="w-4 h-4 text-white" /></div>
                  <span className="text-sm font-semibold text-gray-800">ScreenApp</span>
                </div>
                {['Home','My Recordings','Shared','Favorites'].map(item=>(
                  <div key={item} className="px-2 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors duration-150">{item}</div>
                ))}
                <div className="mt-3 text-xs font-semibold text-gray-400 uppercase px-2">Recent</div>
                {['Team Standup','Client Demo','Product Review'].map(r=>(
                  <div key={r} className="px-2 py-1.5 rounded-md text-xs text-gray-600 hover:bg-gray-100 cursor-pointer truncate transition-colors duration-150">{r}</div>
                ))}
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 p-3 border-b border-gray-200">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-400 text-sm">⌕</span>
                    <span className="text-sm text-gray-400">How can I help?</span>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:BRAND_BLUE}}>U</div>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-white/30 transition-colors duration-150">
                        <div style={{width:0,height:0,borderTop:'8px solid transparent',borderBottom:'8px solid transparent',borderLeft:'14px solid white',marginLeft:'3px'}} />
                      </div>
                      <div className="text-sm text-gray-400">Team Standup Q3</div>
                      <div className="text-xs text-gray-600 mt-1">12:34 mins</div>
                    </div>
                  </div>
                  <div className="w-72 border-l border-gray-200 bg-white flex flex-col">
                    <div className="flex border-b border-gray-200">
                      {['Transcript','Summary','Chat'].map((t,i)=>(
                        <div key={t} className={`flex-1 text-center py-2.5 text-xs font-medium cursor-pointer transition-colors duration-150 ${i===0?'text-blue-600 border-b-2 border-blue-500':'text-gray-500 hover:text-gray-700'}`}>{t}</div>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {[{t:'0:00',s:'John',c:'text-blue-600'},{t:'0:15',s:'Sarah',c:'text-violet-600'},{t:'0:42',s:'Mike',c:'text-emerald-600'}].map(({t,s,c})=>(
                        <div key={t} className="text-xs">
                          <div className="flex gap-2 mb-1"><span className="text-gray-400">{t}</span><span className={`font-semibold ${c}`}>{s}</span></div>
                          <div className="h-2 bg-gray-100 rounded mb-0.5" /><div className="h-2 bg-gray-100 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-10 px-4 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-gray-400 mb-5 uppercase tracking-widest font-semibold">Trusted by professionals and businesses globally</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustedCompanies.map(c=><span key={c} className="text-gray-300 font-bold text-lg tracking-wide uppercase">{c}</span>)}
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {bentoItems.map((item,i)=>{
            const IconComp = ICON_MAP[item.icon];
            return (
              <div key={i} className={`bg-gradient-to-br ${item.bg} rounded-2xl p-5 cursor-pointer hover:scale-105 transition-transform duration-200 min-h-36 flex flex-col justify-between`}>
                {IconComp && <IconComp className="w-6 h-6 text-white/80" />}
                <div><h3 className="text-sm font-semibold text-white leading-tight">{item.title}</h3><p className="text-xs text-white/70 mt-1">{item.desc}</p></div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Blocks */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureBlocks.map(f=>(
            <div key={f.id} className={`${colorBg[f.color]} rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow duration-200`}>
              <div className="mb-4"><FeatureMockUI id={f.id} /></div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${colorTag[f.color]}`}>{f.tag}</span>
              <h3 className="text-base font-bold text-gray-900 mt-1">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">Real Results from Real Users</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {testimonials.map(t=>(
              <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex gap-0.5 mb-3">{Array(5).fill(0).map((_,i)=><Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${t.bg} flex items-center justify-center text-xs font-bold ${t.color}`}>{t.initials}</div>
                  <div><div className="text-sm font-semibold text-gray-900">{t.name}</div><div className="text-xs text-gray-400">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-10">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq,i)=>(
              <AccordionItem key={i} value={`faq-${i}`} className="bg-white border border-gray-100 rounded-xl px-5 shadow-sm">
                <AccordionTrigger className="text-sm font-semibold text-gray-900 hover:no-underline py-4 text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-gray-500 pb-4 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="flex -space-x-2">
              {['A','J','S'].map((l,i)=><div key={i} className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-bold text-white" style={{background:avatarColors[i]}}>{l}</div>)}
            </div>
            <span className="text-gray-300 text-sm">Join 2,147,483+ users</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop watching. Start understanding.</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">Join thousands who've discovered their window into every conversation. Transform hours of recordings into instant insights.</p>
          <button onClick={() => navigate('/app')} className="text-gray-900 bg-white font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100 transition-colors duration-150">
            Try ScreenApp Free
          </button>
          <p className="text-gray-500 text-sm mt-4">Start recording in 60 seconds • No credit card required</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
