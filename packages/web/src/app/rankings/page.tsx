import Link from 'next/link';

export const metadata = {
  title: 'Rankings | Democracy Watch',
  description: 'See how members of Congress rank on accountability metrics',
};

export default function RankingsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href="/" className="text-primary-600 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-4">Congressional Rankings</h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Track how members of Congress rank on key accountability metrics including
        party alignment, promise fulfillment, and voting patterns.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Party Alignment</h2>
          <p className="text-gray-600 mb-4">
            See which members vote most and least with their party.
          </p>
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-300 rounded-lg">
            Coming in Phase 2
          </div>
        </div>

        <div className="card bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Promise Tracking</h2>
          <p className="text-gray-600 mb-4">
            Compare campaign promises to actual voting records.
          </p>
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-300 rounded-lg">
            Coming in Phase 3
          </div>
        </div>

        <div className="card bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Funding Influence</h2>
          <p className="text-gray-600 mb-4">
            Analyze correlations between donations and voting patterns.
          </p>
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-300 rounded-lg">
            Coming in Phase 3
          </div>
        </div>

        <div className="card bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Attendance</h2>
          <p className="text-gray-600 mb-4">
            Track voting participation rates across Congress.
          </p>
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-300 rounded-lg">
            Coming in Phase 2
          </div>
        </div>
      </div>
    </div>
  );
}
