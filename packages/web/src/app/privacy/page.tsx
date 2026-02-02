import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Democracy Watch',
  description: 'Privacy policy for Democracy Watch',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href="/" className="text-primary-600 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Overview</h2>
          <p className="text-gray-700">
            Democracy Watch is committed to protecting your privacy. This policy
            explains how we collect, use, and safeguard your information when you
            use our website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
          <p className="text-gray-700 mb-4">
            We collect minimal information to provide our services:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <strong>ZIP Code Searches:</strong> When you search for representatives
              by ZIP code, we process this information to return results but do not
              store it in a way that identifies you.
            </li>
            <li>
              <strong>Usage Analytics:</strong> We may collect anonymous usage
              statistics to improve our service, such as which pages are visited most
              frequently.
            </li>
            <li>
              <strong>Technical Information:</strong> Standard web server logs
              including IP addresses, browser type, and access times.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">How We Use Information</h2>
          <p className="text-gray-700">
            We use collected information solely to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2">
            <li>Provide and improve our services</li>
            <li>Respond to your inquiries</li>
            <li>Analyze usage patterns to enhance user experience</li>
            <li>Maintain security and prevent abuse</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Information Sharing</h2>
          <p className="text-gray-700">
            We do not sell, trade, or otherwise transfer your personal information
            to third parties. We may share anonymous, aggregated statistics about
            site usage.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Cookies</h2>
          <p className="text-gray-700">
            We may use cookies to enhance your experience. You can configure your
            browser to refuse cookies, though some features may not function properly
            without them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Data Security</h2>
          <p className="text-gray-700">
            We implement reasonable security measures to protect any information we
            collect. However, no method of transmission over the Internet is 100%
            secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Third-Party Links</h2>
          <p className="text-gray-700">
            Our site may contain links to external websites (such as official
            government sites). We are not responsible for the privacy practices of
            these external sites.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
          <p className="text-gray-700">
            We may update this privacy policy from time to time. Changes will be
            posted on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-gray-700">
            If you have questions about this privacy policy, please{' '}
            <Link href="/contact" className="text-primary-600 hover:underline">
              contact us
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
