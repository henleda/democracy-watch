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
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="Enter your ZIP code"
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
          maxLength={10}
          aria-label="ZIP code"
        />
        <button type="submit" className="btn-primary px-6">
          Find Reps
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
