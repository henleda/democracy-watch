'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

export function BillFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get('q') || '';
  const currentCongress = searchParams.get('congress') || '';
  const currentChamber = searchParams.get('chamber') || '';

  const [searchInput, setSearchInput] = useState(currentQuery);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete('page');
      router.push(`/bills?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('q', searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    updateFilter('q', '');
  };

  return (
    <div className="card mb-8">
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search bills by keyword..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Congress
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2"
              value={currentCongress}
              onChange={(e) => updateFilter('congress', e.target.value)}
            >
              <option value="">All Congresses</option>
              <option value="119">119th (2025-2027)</option>
              <option value="118">118th (2023-2025)</option>
              <option value="117">117th (2021-2023)</option>
              <option value="116">116th (2019-2021)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chamber
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2"
              value={currentChamber}
              onChange={(e) => updateFilter('chamber', e.target.value)}
            >
              <option value="">Both Chambers</option>
              <option value="house">House</option>
              <option value="senate">Senate</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(currentQuery || currentCongress || currentChamber) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Active filters:</span>
            {currentQuery && (
              <span className="bg-blue-100 text-brand-blue px-2 py-1 rounded flex items-center gap-1">
                &quot;{currentQuery}&quot;
                <button
                  onClick={clearSearch}
                  className="text-blue-400 hover:text-blue-600"
                  aria-label="Remove search filter"
                >
                  &times;
                </button>
              </span>
            )}
            {currentCongress && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                Congress {currentCongress}
                <button
                  onClick={() => updateFilter('congress', '')}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Remove congress filter"
                >
                  &times;
                </button>
              </span>
            )}
            {currentChamber && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                {currentChamber === 'house' ? 'House' : 'Senate'}
                <button
                  onClick={() => updateFilter('chamber', '')}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Remove chamber filter"
                >
                  &times;
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
