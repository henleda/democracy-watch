'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BillSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Navigate to bills page with search query
    router.push(`/bills?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bills by keyword..."
          className="flex-1 px-5 py-3.5 text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue shadow-sm text-center sm:text-left text-lg"
          aria-label="Search legislation"
        />
        <button
          type="submit"
          className="bg-brand-blue hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          Search Bills
        </button>
      </div>
      <p className="text-gray-500 text-sm">
        Examples: &quot;healthcare&quot;, &quot;immigration&quot;, &quot;H.R. 1234&quot;
      </p>
    </form>
  );
}
