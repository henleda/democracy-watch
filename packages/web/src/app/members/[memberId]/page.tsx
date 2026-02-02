import { getMember, getMemberVotes } from '@/lib/api';
import Link from 'next/link';

interface PageProps {
  params: { memberId: string };
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const response = await getMember(params.memberId);
    const member = response.data;
    return {
      title: `${member.fullName} | Democracy Watch`,
      description: `Voting record and accountability for ${member.fullName}`,
    };
  } catch {
    return {
      title: 'Member Not Found | Democracy Watch',
    };
  }
}

export default async function MemberDetailPage({ params }: PageProps) {
  try {
    const [memberResponse, votesResponse] = await Promise.all([
      getMember(params.memberId),
      getMemberVotes(params.memberId, { limit: 10 }),
    ]);

    const member = memberResponse.data;
    const votes = votesResponse.data;

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
          ? `Representative (District ${member.district})`
          : 'Representative';

    // Get initials from full name
    const nameParts = member.fullName.split(' ');
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : member.fullName.substring(0, 2);

    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <Link href="/members" className="text-primary-600 hover:underline">
            &larr; Back to Members
          </Link>
        </div>

        {/* Member Header */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-3xl font-bold">
                {initials.toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {chamberLabel} {member.fullName}
              </h1>
              <p className="text-gray-600 mb-4">
                {chamberLabel} &bull; {member.stateCode}
              </p>
              <span className={partyClass}>{member.party}</span>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {member.websiteUrl && (
                  <a
                    href={member.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    Website
                  </a>
                )}
                {member.twitterHandle && (
                  <a
                    href={`https://twitter.com/${member.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    @{member.twitterHandle}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Votes */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Votes</h2>
          {votes.length === 0 ? (
            <p className="text-gray-600">No voting records available yet.</p>
          ) : (
            <div className="space-y-4">
              {votes.map((vote) => (
                <div key={vote.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">
                        {vote.bill?.title || vote.rollCall?.voteQuestion || 'Vote'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(vote.voteDate).toLocaleDateString()}
                        {vote.rollCall?.voteResult && ` \u2022 ${vote.rollCall.voteResult}`}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded font-medium ${
                        vote.position === 'Yea'
                          ? 'bg-green-100 text-green-800'
                          : vote.position === 'Nay'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vote.position}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Placeholder sections for Phase 2-3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Campaign Finance</h2>
          <div className="card bg-gray-50 text-gray-500 text-center py-8">
            Coming in Phase 2: See who funds this representative
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Promise Tracking</h2>
          <div className="card bg-gray-50 text-gray-500 text-center py-8">
            Coming in Phase 3: Track promises vs. voting record
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4 text-red-600">
          Member Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          We couldn&apos;t find this member. They may no longer be in Congress.
        </p>
        <Link href="/members" className="btn-primary">
          View All Members
        </Link>
      </div>
    );
  }
}
