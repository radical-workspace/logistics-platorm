'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/app/components/BrandLogo';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  const navItems = useMemo(() => ([
    { href: '/', label: 'Home' },
    { href: '/solutions', label: 'Solutions' },
    { href: '/platform', label: 'Platform' },
    { href: '/company', label: 'Company' },
    { href: '/contact', label: 'Contact' },
    { href: '/tracking', label: 'Tracking' },
  ]), []);

  const primaryCta = { href: '/dashboard/auth/login', label: 'Client login' };
  const secondaryCta = { href: '/contact', label: 'Book a call' };

  return (
    <header className="fixed top-0 w-full z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <BrandLogo />

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={secondaryCta.href}
            className="text-sm font-semibold text-slate-100 px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 transition"
          >
            {secondaryCta.label}
          </Link>
          <Link
            href={primaryCta.href}
            className="bg-blue-600 hover:bg-blue-700 transition px-5 py-2 rounded-full text-sm font-bold shadow-lg"
          >
            {primaryCta.label}
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-16 sm:top-20 left-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
          <div className="px-4 py-6 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-3 text-slate-200 hover:text-white rounded-lg px-4 transition bg-slate-900/70 border border-slate-800"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href={secondaryCta.href}
                className="text-center text-slate-100 px-4 py-3 rounded-lg border border-slate-700 hover:border-slate-500 transition"
                onClick={() => setMenuOpen(false)}
              >
                {secondaryCta.label}
              </Link>
              <Link
                href={primaryCta.href}
                className="text-center bg-blue-600 hover:bg-blue-700 transition px-4 py-3 rounded-lg font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                {primaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
