'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-brand-navy to-primary-800 shadow-lg">
      <nav className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.webp"
              alt="Democracy Watch"
              width={48}
              height={48}
              className="rounded-lg group-hover:scale-105 transition-transform"
              priority
            />
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-white">
                Democracy<span className="text-brand-gold">Watch</span>
              </span>
              <span className="block text-xs text-gray-300">
                They Work For You
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/members"
              className="text-gray-200 hover:text-white transition-colors"
            >
              Members
            </Link>
            <Link
              href="/rankings"
              className="text-gray-200 hover:text-white transition-colors"
            >
              Rankings
            </Link>
            <Link
              href="/about"
              className="text-gray-200 hover:text-white transition-colors"
            >
              About
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
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

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 border-t border-primary-700 pt-4">
            <Link
              href="/members"
              className="block text-gray-200 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Members
            </Link>
            <Link
              href="/rankings"
              className="block text-gray-200 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Rankings
            </Link>
            <Link
              href="/about"
              className="block text-gray-200 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
