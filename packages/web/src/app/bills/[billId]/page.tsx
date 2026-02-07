import { getBill } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    billId: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const response = await getBill(params.billId);
    const bill = response.data;
    const identifier = formatBillIdentifier(bill.billType, bill.billNumber);

    return {
      title: `${identifier} - ${bill.title} | Democracy Watch`,
      description: bill.summary?.substring(0, 160) || `Details and voting record for ${identifier}`,
    };
  } catch {
    return {
      title: 'Bill Not Found | Democracy Watch',
    };
  }
}

export default async function BillDetailPage({ params }: PageProps) {
  let bill;
  try {
    const response = await getBill(params.billId);
    bill = response.data;
  } catch {
    notFound();
  }

  if (!bill) {
    notFound();
  }

  const identifier = formatBillIdentifier(bill.billType, bill.billNumber);
  const congressOrdinal = getOrdinal(bill.congress);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl font-bold text-brand-blue">{identifier}</span>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
            {congressOrdinal} Congress
          </span>
          {bill.policyArea && (
            <span className="bg-blue-50 text-brand-blue px-3 py-1 rounded-full text-sm">
              {bill.policyArea}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{bill.title}</h1>

        {/* Sponsor */}
        {bill.sponsorName && (
          <p className="text-gray-600 mb-2">
            Sponsored by:{' '}
            {bill.sponsorId ? (
              <Link
                href={`/members/${bill.sponsorId}`}
                className="text-brand-blue hover:underline font-medium"
              >
                {bill.sponsorName}
              </Link>
            ) : (
              <span className="font-medium">{bill.sponsorName}</span>
            )}
            {bill.sponsorParty && (
              <span className={`ml-2 ${getPartyColorClass(bill.sponsorParty)}`}>
                ({bill.sponsorParty.charAt(0)})
              </span>
            )}
          </p>
        )}

        {bill.introducedDate && (
          <p className="text-gray-500 text-sm">
            Introduced: {formatDate(bill.introducedDate)}
          </p>
        )}
      </div>

      {/* Summary */}
      {bill.summary && (
        <section className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{bill.summary}</p>
        </section>
      )}

      {/* Subjects */}
      {bill.subjects && bill.subjects.length > 0 && (
        <section className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {bill.subjects.map((subject, idx) => (
              <span
                key={idx}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {subject}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Full Text Link */}
      {bill.fullTextUrl && (
        <section className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Full Text</h2>
          <a
            href={bill.fullTextUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Full Text on Congress.gov
          </a>
        </section>
      )}

      {/* Voting Record */}
      {bill.rollCalls && bill.rollCalls.length > 0 && (
        <section className="card">
          <h2 className="text-xl font-bold mb-6">Voting Record</h2>

          <div className="space-y-6">
            {bill.rollCalls.map((rollCall) => (
              <div key={rollCall.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="font-semibold text-gray-900">
                    {rollCall.chamber === 'house' ? 'House' : 'Senate'} Vote
                  </span>
                  <span className="text-gray-500 text-sm">
                    {formatDate(rollCall.voteDate)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    rollCall.voteResult?.toLowerCase().includes('passed')
                      ? 'bg-green-100 text-green-800'
                      : rollCall.voteResult?.toLowerCase().includes('failed')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {rollCall.voteResult || 'Unknown'}
                  </span>
                </div>

                {rollCall.voteQuestion && (
                  <p className="text-gray-600 mb-4">{rollCall.voteQuestion}</p>
                )}

                {/* Vote Totals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {rollCall.yeaTotal ?? '-'}
                    </div>
                    <div className="text-sm text-green-600">Yea</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">
                      {rollCall.nayTotal ?? '-'}
                    </div>
                    <div className="text-sm text-red-600">Nay</div>
                  </div>
                  <div className="col-span-2 hidden md:block"></div>
                </div>

                {/* Party Breakdown */}
                {hasPartyBreakdown(rollCall) && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Party Breakdown</h4>

                    {rollCall.republicanYea != null && rollCall.republicanNay != null && (
                      <PartyVoteBar
                        label="Republicans"
                        labelClass="text-red-700"
                        yea={rollCall.republicanYea}
                        nay={rollCall.republicanNay}
                      />
                    )}

                    {rollCall.democratYea != null && rollCall.democratNay != null && (
                      <PartyVoteBar
                        label="Democrats"
                        labelClass="text-blue-700"
                        yea={rollCall.democratYea}
                        nay={rollCall.democratNay}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No Votes */}
      {(!bill.rollCalls || bill.rollCalls.length === 0) && (
        <section className="card">
          <h2 className="text-xl font-bold mb-4">Voting Record</h2>
          <p className="text-gray-600">
            No floor votes have been recorded for this bill yet.
          </p>
        </section>
      )}

      {/* Latest Action */}
      {bill.latestAction && (
        <section className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Latest Action</h2>
          <p className="text-gray-700">{bill.latestAction}</p>
          {bill.latestActionDate && (
            <p className="text-gray-500 text-sm mt-1">{formatDate(bill.latestActionDate)}</p>
          )}
        </section>
      )}
    </div>
  );
}

function formatBillIdentifier(billType: string, billNumber: number): string {
  const typeMap: Record<string, string> = {
    hr: 'H.R.',
    hres: 'H.Res.',
    hjres: 'H.J.Res.',
    hconres: 'H.Con.Res.',
    s: 'S.',
    sres: 'S.Res.',
    sjres: 'S.J.Res.',
    sconres: 'S.Con.Res.',
  };
  const prefix = typeMap[billType.toLowerCase()] || billType.toUpperCase();
  return `${prefix} ${billNumber}`;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getPartyColorClass(party: string): string {
  switch (party) {
    case 'Republican':
      return 'text-red-600';
    case 'Democrat':
      return 'text-blue-600';
    case 'Independent':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

function hasPartyBreakdown(rollCall: {
  republicanYea?: number | null;
  republicanNay?: number | null;
  democratYea?: number | null;
  democratNay?: number | null;
}): boolean {
  return (
    (rollCall.republicanYea != null && rollCall.republicanNay != null) ||
    (rollCall.democratYea != null && rollCall.democratNay != null)
  );
}

function PartyVoteBar({
  label,
  labelClass,
  yea,
  nay,
}: {
  label: string;
  labelClass: string;
  yea: number;
  nay: number;
}) {
  const total = yea + nay;
  if (total === 0) {
    return (
      <div className="flex items-center gap-4">
        <span className={`w-24 text-sm font-medium ${labelClass}`}>{label}</span>
        <span className="text-gray-500 text-sm">No votes recorded</span>
      </div>
    );
  }

  const yeaPct = (yea / total) * 100;
  const nayPct = (nay / total) * 100;

  return (
    <div className="flex items-center gap-4">
      <span className={`w-24 text-sm font-medium ${labelClass}`}>{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 flex items-center justify-center text-xs text-white font-medium"
            style={{ width: `${yeaPct}%` }}
          >
            {yea > 0 ? yea : ''}
          </div>
          <div
            className="h-full bg-red-500 flex items-center justify-center text-xs text-white font-medium"
            style={{ width: `${nayPct}%` }}
          >
            {nay > 0 ? nay : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
