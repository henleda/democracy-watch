import Link from 'next/link';
import type { MemberListItem } from '@/lib/api';

interface MemberCardProps {
  member: MemberListItem;
}

export function MemberCard({ member }: MemberCardProps) {
  const partyClass =
    member.party === 'Republican'
      ? 'party-badge-republican'
      : member.party === 'Democrat'
        ? 'party-badge-democrat'
        : 'party-badge-independent';

  const chamberLabel =
    member.chamber === 'senate'
      ? 'Senator'
      : member.district && member.district !== 'AL'
        ? `Rep. (District ${member.district})`
        : 'Representative';

  // Get initials from full name
  const nameParts = member.fullName.split(' ');
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : member.fullName.substring(0, 2);

  return (
    <Link
      href={`/members/${member.id}`}
      className="card hover:shadow-lg transition-shadow flex gap-4"
    >
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
          {initials.toUpperCase()}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-lg">
          {member.fullName}
        </h3>
        <p className="text-gray-600 text-sm">
          {chamberLabel} &bull; {member.stateCode}
        </p>
        <span className={partyClass}>{member.party}</span>
      </div>
    </Link>
  );
}
