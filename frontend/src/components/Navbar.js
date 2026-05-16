import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, ArrowRight, AudioWaveform } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './ui/dropdown-menu';

const BRAND_BLUE = '#4175F5';

const NAV_FEATURES = [
  { label: 'AI Transcription', href: '/features/transcription' },
  { label: 'Screen Recorder', href: '/features/screen-recorder' },
  { label: 'AI Summarizer', href: '/features/ai-summarizer' },
  { label: 'Meeting Bot', href: '/features/meeting-bot' },
  { label: 'Audio Translator', href: '/features/audio-translator' },
  { label: 'Video Analyzer', href: '/features/video-analyzer' },
];

const NAV_DOWNLOAD = [
  { label: 'Chrome Extension', href: '/app', state: { openExtension: true } },
  { label: 'Desktop App (Mac)', href: '/features/screen-recorder' },
  { label: 'iOS App', href: '/features/screen-recorder' },
  { label: 'Android App', href: '/features/screen-recorder' },
];

const NAV_EXPLORE = [
  { label: 'All Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Enterprise', href: '/pricing' },
  { label: 'Reviews', href: '/pricing' },
];

const NavDropdown = ({ label, items }) => {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-150 focus:outline-none">
        {label} <ChevronDown className="w-3.5 h-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48 shadow-lg z-50">
        {items.map(item => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => navigate(item.href, item.state ? { state: item.state } : undefined)}
            className="cursor-pointer text-sm py-2"
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Announcement Banner - Home only */}
      {isHome && (
        <div className="bg-gray-900 text-center py-2 px-4">
          <span className="inline-flex items-center gap-2 text-sm text-gray-100">
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">NEW</span>
            Record and instantly find any moment with our Mac app&nbsp;
            <a href="#" className="underline font-medium text-gray-300 hover:text-white transition-colors duration-150">Download Free</a>
          </span>
        </div>
      )}
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: BRAND_BLUE }}
            >
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">ScreenApp</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-7">
            <Link
              to="/pricing"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-150"
            >
              Pricing
            </Link>
            <NavDropdown label="Features" items={NAV_FEATURES} />
            <NavDropdown label="Download" items={NAV_DOWNLOAD} />
            <NavDropdown label="Explore" items={NAV_EXPLORE} />
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-150"
            >
              Login
            </Link>
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity duration-150"
              style={{ background: BRAND_BLUE }}
            >
              Start free <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          <Link
            to="/pricing"
            className="block text-sm text-gray-700 py-2.5 border-b border-gray-50"
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          <div className="block text-sm text-gray-700 py-2.5 border-b border-gray-50">Features</div>
          <div className="block text-sm text-gray-700 py-2.5 border-b border-gray-50">Download</div>
          <Link
            to="/login"
            className="block text-sm text-gray-700 py-2.5 border-b border-gray-50"
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
          <button
            onClick={() => { navigate('/app'); setMobileOpen(false); }}
            className="block w-full text-sm font-semibold text-white py-3 rounded-full text-center mt-2"
            style={{ background: BRAND_BLUE }}
          >
            Start free →
          </button>
        </div>
      )}
    </nav>
    </div>
  );
};

export default Navbar;
