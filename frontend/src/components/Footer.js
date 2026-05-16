import React from 'react';
import { Link } from 'react-router-dom';
import { AudioWaveform, Twitter, Linkedin, Youtube, Github } from 'lucide-react';

const BRAND_BLUE = '#4175F5';

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'Screen Recorder', href: '/features' },
      { label: 'AI Transcription', href: '/features' },
      { label: 'AI Summarizer', href: '/features' },
      { label: 'Meeting Bot', href: '/features' },
      { label: 'Video Analyzer', href: '/features' },
      { label: 'Audio Translator', href: '/features' },
    ]
  },
  {
    title: 'Download',
    links: [
      { label: 'Chrome Extension', href: '/chrome' },
      { label: 'Mac App', href: '/desktop' },
      { label: 'iOS App', href: '/mobile' },
      { label: 'Android App', href: '/mobile' },
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Blog', href: '/blog' },
      { label: 'Reviews', href: '/reviews' },
      { label: 'Enterprise', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Trust Center', href: '/trust' },
    ]
  }
];

const socialIcons = [
  { Icon: Twitter, label: 'Twitter', href: 'https://twitter.com' },
  { Icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
  { Icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
  { Icon: Github, label: 'GitHub', href: 'https://github.com' },
];

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: BRAND_BLUE }}
              >
                <AudioWaveform className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-bold text-gray-900">ScreenApp</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs">
              AI-powered screen recording, transcription, and video analysis. Transform your meetings into instant insights.
            </p>
            <div className="flex items-center gap-3">
              {socialIcons.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors duration-150"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Sections */}
          {footerSections.map(section => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400">© 2025 ScreenApp. All rights reserved.</p>
          <p className="text-sm text-gray-400">Loved by 3+ million people worldwide</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
