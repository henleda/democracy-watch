import Link from 'next/link';
import type { BillListItem } from '@/lib/api';

interface BillCardProps {
  bill: BillListItem;
}

export function BillCard({ bill }: BillCardProps) {
  const billIdentifier = formatBillIdentifier(bill.billType, bill.billNumber);
  const status = determineBillStatus(bill.latestAction);

  const statusClass =
    status === 'passed'
      ? 'bg-green-100 text-green-800'
      : status === 'failed'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-600';

  const statusLabel =
    status === 'passed' ? 'Passed' : status === 'failed' ? 'Failed' : 'Pending';

  return (
    <Link
      href={`/bills/${bill.billType}-${bill.congress}-${bill.billNumber}`}
      className="card hover:shadow-lg transition-shadow block"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-semibold text-brand-blue">
          {billIdentifier}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {bill.title}
      </h3>

      {bill.summary && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {bill.summary}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm text-gray-500">
        {bill.policyArea && (
          <span className="bg-blue-50 text-brand-blue px-2 py-0.5 rounded">
            {bill.policyArea}
          </span>
        )}

        {bill.sponsorName && (
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${getPartyColor(bill.sponsorParty)}`}></span>
            {bill.sponsorName}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>Congress {bill.congress}</span>
        {bill.voteCount && bill.voteCount > 0 ? (
          <span className="text-brand-blue font-medium">
            {bill.voteCount} vote{bill.voteCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span>No votes yet</span>
        )}
      </div>
    </Link>
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

function determineBillStatus(latestAction?: string): 'passed' | 'failed' | 'pending' {
  if (!latestAction) return 'pending';

  const action = latestAction.toLowerCase();

  if (
    action.includes('became public law') ||
    action.includes('became law') ||
    action.includes('signed by president') ||
    action.includes('passed house') && action.includes('passed senate')
  ) {
    return 'passed';
  }

  if (
    action.includes('failed') ||
    action.includes('vetoed') ||
    action.includes('pocket vetoed')
  ) {
    return 'failed';
  }

  return 'pending';
}

function getPartyColor(party?: string): string {
  switch (party) {
    case 'Republican':
      return 'bg-red-500';
    case 'Democrat':
      return 'bg-blue-500';
    case 'Independent':
      return 'bg-purple-500';
    default:
      return 'bg-gray-400';
  }
}
