'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ZipSearch() {
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate ZIP code format
    const zipPattern = /^\d{5}(-\d{4})?$/;
    if (!zipPattern.test(zipCode)) {
      setError('Please enter a valid 5-digit ZIP code');
      return;
    }

    // Navigate to results page
    router.push(`/members/zip/${zipCode.slice(0, 5)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="Enter your ZIP code"
          className="flex-1 px-4 py-3 text-gray-900 bg-white border-2 border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent shadow-lg text-center sm:text-left"
          maxLength={10}
          aria-label="ZIP code"
        />
        <button
          type="submit"
          className="bg-brand-gold hover:bg-amber-500 text-brand-navy font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          Find My Reps
        </button>
      </div>
      {error && (
        <p className="text-red-300 text-sm bg-red-900/30 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}
    </form>
  );
}
