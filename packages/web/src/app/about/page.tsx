import Link from 'next/link';

export const metadata = {
  title: 'About | Democracy Watch',
  description: 'Learn about Democracy Watch and our mission to make congressional accountability transparent',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href="/" className="text-primary-600 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">About Democracy Watch</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
          <p className="text-gray-700 mb-4">
            Democracy Watch is a non-partisan civic technology platform dedicated to
            making congressional accountability transparent and accessible to every
            citizen. We believe that informed voters are the foundation of a healthy
            democracy.
          </p>
          <p className="text-gray-700">
            Our platform correlates congressional voting records against campaign
            promises and funding data to help you understand how your representatives
            actually vote relative to what they say.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">What We Track</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <strong>Voting Records:</strong> Every vote cast by members of Congress
            </li>
            <li>
              <strong>Campaign Promises:</strong> Statements and commitments made by
              representatives
            </li>
            <li>
              <strong>Campaign Finance:</strong> Who funds your representatives and how
              much
            </li>
            <li>
              <strong>Party Alignment:</strong> How often members vote with or against
              their party
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Our Data Sources</h2>
          <p className="text-gray-700 mb-4">
            All our data comes from official government sources:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <strong>Congress.gov:</strong> Official voting records, bill information,
              and member data
            </li>
            <li>
              <strong>Federal Election Commission:</strong> Campaign contribution data
            </li>
            <li>
              <strong>Senate Lobbying Disclosure Act:</strong> Lobbying activity
              records
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Open Source</h2>
          <p className="text-gray-700">
            Democracy Watch is an open source project. We believe transparency should
            extend to our own code. You can view, contribute to, or fork our project
            on{' '}
            <a
              href="https://github.com/democracy-watch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
          <p className="text-gray-700">
            Have questions or feedback? We&apos;d love to hear from you. Visit our{' '}
            <Link href="/contact" className="text-primary-600 hover:underline">
              contact page
            </Link>{' '}
            to get in touch.
          </p>
        </section>
      </div>
    </div>
  );
}
