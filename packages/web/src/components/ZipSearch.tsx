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
          className="flex-1 px-5 py-3.5 text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue shadow-sm text-center sm:text-left text-lg"
          maxLength={10}
          aria-label="ZIP code"
        />
        <button
          type="submit"
          className="bg-brand-red hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          Find My Reps
        </button>
      </div>
      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-200">
          {error}
        </p>
      )}
    </form>
  );
}
