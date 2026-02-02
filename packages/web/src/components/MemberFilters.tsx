'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function MemberFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentState = searchParams.get('state') || '';
  const currentParty = searchParams.get('party') || '';
  const currentChamber = searchParams.get('chamber') || '';

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
      router.push(`/members?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="card mb-8">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={currentState}
            onChange={(e) => updateFilter('state', e.target.value)}
          >
            <option value="">All States</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Party
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={currentParty}
            onChange={(e) => updateFilter('party', e.target.value)}
          >
            <option value="">All Parties</option>
            <option value="Democrat">Democrat</option>
            <option value="Republican">Republican</option>
            <option value="Independent">Independent</option>
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
            <option value="senate">Senate</option>
            <option value="house">House</option>
          </select>
        </div>
      </div>
    </div>
  );
}
