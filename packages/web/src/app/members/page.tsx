import { Suspense } from 'react';
import { getMembers } from '@/lib/api';
import { MemberCard } from '@/components/MemberCard';
import { MemberFilters } from '@/components/MemberFilters';
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

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.state) params.set('state', searchParams.state);
    if (searchParams.party) params.set('party', searchParams.party);
    if (searchParams.chamber) params.set('chamber', searchParams.chamber);
    params.set('page', String(newPage));
    return `/members?${params.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Members of Congress</h1>

      {/* Filters - Client Component wrapped in Suspense for SSR */}
      <Suspense fallback={<div className="card mb-8 h-20 animate-pulse bg-gray-100" />}>
        <MemberFilters />
      </Suspense>

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
                  href={buildPaginationUrl(page - 1)}
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
                  href={buildPaginationUrl(page + 1)}
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
