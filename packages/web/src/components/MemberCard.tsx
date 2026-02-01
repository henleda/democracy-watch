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
    member.chamber === 'Senate'
      ? 'Senator'
      : member.district
        ? `Rep. (District ${member.district})`
        : 'Representative';

  return (
    <Link
      href={`/members/${member.id}`}
      className="card hover:shadow-lg transition-shadow flex gap-4"
    >
      <div className="flex-shrink-0">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={`${member.first_name} ${member.last_name}`}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
            {member.first_name[0]}
            {member.last_name[0]}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-lg">
          {member.first_name} {member.last_name}
        </h3>
        <p className="text-gray-600 text-sm">
          {chamberLabel} • {member.state}
        </p>
        <span className={partyClass}>{member.party}</span>
      </div>
    </Link>
  );
}
