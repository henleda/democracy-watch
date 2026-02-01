import { getMembers } from '@/lib/api';
import { MemberCard } from '@/components/MemberCard';
import Link from 'next/link';

interface PageProps {
  searchParams: {
    state?: string;
    party?: string;
    chamber?: string;
    page?: string;
  };
}

export const metadata = {
  title: 'All Members of Congress | Democracy Watch',
  description: 'Browse all current members of the U.S. Congress',
};

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default async function MembersPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const response = await getMembers({
    state: searchParams.state,
    party: searchParams.party,
    chamber: searchParams.chamber,
    limit,
    offset,
  });

  const members = response.data;
  const total = response.meta?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    return `/members?${searchParams.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Members of Congress</h1>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2"
              defaultValue={searchParams.state || ''}
              onChange={(e) => {
                window.location.href = buildUrl({
                  ...searchParams,
                  state: e.target.value || undefined,
                  page: undefined,
                });
              }}
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
              defaultValue={searchParams.party || ''}
              onChange={(e) => {
                window.location.href = buildUrl({
                  ...searchParams,
                  party: e.target.value || undefined,
                  page: undefined,
                });
              }}
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
              defaultValue={searchParams.chamber || ''}
              onChange={(e) => {
                window.location.href = buildUrl({
                  ...searchParams,
                  chamber: e.target.value || undefined,
                  page: undefined,
                });
              }}
            >
              <option value="">Both Chambers</option>
              <option value="Senate">Senate</option>
              <option value="House">House</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {members.length === 0 ? (
        <p className="text-gray-600">No members found matching your filters.</p>
      ) : (
        <>
          <p className="text-gray-600 mb-4">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}{' '}
            members
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ ...searchParams, page: String(page - 1) })}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildUrl({ ...searchParams, page: String(page + 1) })}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
