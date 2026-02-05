import { Suspense } from 'react';
import { getBills } from '@/lib/api';
import { BillCard } from '@/components/BillCard';
import { BillFilters } from '@/components/BillFilters';
import Link from 'next/link';

interface PageProps {
  searchParams: {
    q?: string;
    congress?: string;
    chamber?: string;
    policyArea?: string;
    page?: string;
  };
}

export const metadata = {
  title: 'Legislation Search | Democracy Watch',
  description: 'Search and browse congressional bills and resolutions',
};

export default async function BillsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const response = await getBills({
    q: searchParams.q,
    congress: searchParams.congress ? parseInt(searchParams.congress) : undefined,
    chamber: searchParams.chamber,
    policyArea: searchParams.policyArea,
    limit,
    offset,
  });

  const bills = response.data;
  const total = response.meta?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set('q', searchParams.q);
    if (searchParams.congress) params.set('congress', searchParams.congress);
    if (searchParams.chamber) params.set('chamber', searchParams.chamber);
    if (searchParams.policyArea) params.set('policyArea', searchParams.policyArea);
    params.set('page', String(newPage));
    return `/bills?${params.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {searchParams.q ? (
            <>
              Results for &quot;<span className="text-brand-blue">{searchParams.q}</span>&quot;
            </>
          ) : (
            'Browse Legislation'
          )}
        </h1>
        {total > 0 && (
          <p className="text-gray-600">
            {total.toLocaleString()} bill{total !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="card mb-8 h-20 animate-pulse bg-gray-100" />}>
        <BillFilters />
      </Suspense>

      {/* Results */}
      {bills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No bills found matching your search.</p>
          <Link href="/bills" className="text-brand-blue hover:underline">
            Clear filters and browse all bills
          </Link>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-4">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total.toLocaleString()} bills
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {bills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
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
                Page {page} of {totalPages.toLocaleString()}
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
