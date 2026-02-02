import { getMembersByZip } from '@/lib/api';
import { MemberCard } from '@/components/MemberCard';
import Link from 'next/link';

interface PageProps {
  params: { zipCode: string };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Representatives for ${params.zipCode} | Democracy Watch`,
    description: `Find your congressional representatives for ZIP code ${params.zipCode}`,
  };
}

export default async function ZipResultsPage({ params }: PageProps) {
  const { zipCode } = params;

  try {
    const response = await getMembersByZip(zipCode);
    const result = response.data;

    if (!result || !result.representatives || result.representatives.length === 0) {
      return (
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-4">
            No Representatives Found
          </h1>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t find representatives for ZIP code {zipCode}. This
            could mean:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-8">
            <li>The ZIP code is invalid</li>
            <li>Our database is still being populated</li>
            <li>This ZIP code covers multiple districts</li>
          </ul>
          <Link href="/" className="btn-primary">
            Try Another ZIP Code
          </Link>
        </div>
      );
    }

    const senators = result.representatives.filter((r) => r.chamber === 'senate');
    const houseReps = result.representatives.filter((r) => r.chamber === 'house');

    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:underline">
            &larr; Back to Search
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Your Representatives
        </h1>
        <p className="text-gray-600 mb-8">
          ZIP code {result.zipCode} &bull; {result.state.name}
          {result.district && result.district !== 'AL' && ` \u2022 District ${result.district}`}
        </p>

        {senators.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Senators ({senators.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {senators.map((rep) => (
                <MemberCard key={rep.member.id} member={rep.member} />
              ))}
            </div>
          </section>
        )}

        {houseReps.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">
              House Representative{houseReps.length > 1 ? 's' : ''} ({houseReps.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {houseReps.map((rep) => (
                <MemberCard key={rep.member.id} member={rep.member} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4 text-red-600">
          Error Loading Representatives
        </h1>
        <p className="text-gray-600 mb-8">
          We encountered an error while looking up representatives. Please try
          again later.
        </p>
        <Link href="/" className="btn-primary">
          Go Back
        </Link>
      </div>
    );
  }
}
