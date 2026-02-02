'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="Democracy Watch"
              width={280}
              height={100}
              className="h-16 md:h-20 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/members"
              className="text-gray-700 hover:text-brand-blue font-medium transition-colors"
            >
              Members
            </Link>
            <Link
              href="/rankings"
              className="text-gray-700 hover:text-brand-blue font-medium transition-colors"
            >
              Rankings
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-brand-blue font-medium transition-colors"
            >
              About
            </Link>
            <Link
              href="/"
              className="bg-brand-red hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors"
            >
              Find My Reps
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700"
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
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
            <Link
              href="/members"
              className="block text-gray-700 hover:text-brand-blue font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Members
            </Link>
            <Link
              href="/rankings"
              className="block text-gray-700 hover:text-brand-blue font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Rankings
            </Link>
            <Link
              href="/about"
              className="block text-gray-700 hover:text-brand-blue font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/"
              className="block bg-brand-red hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Find My Reps
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
