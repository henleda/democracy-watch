import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use | Democracy Watch',
  description: 'Terms of use for Democracy Watch',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href="/" className="text-primary-600 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
          <p className="text-gray-700">
            By accessing and using Democracy Watch, you accept and agree to be
            bound by these Terms of Use. If you do not agree to these terms,
            please do not use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Use of Service</h2>
          <p className="text-gray-700 mb-4">
            Democracy Watch provides information about congressional voting
            records, campaign finance, and related civic data. You agree to use
            this service only for lawful purposes and in accordance with these
            terms.
          </p>
          <p className="text-gray-700">You agree not to:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2">
            <li>Use automated systems to scrape or collect data at scale</li>
            <li>Attempt to interfere with the proper functioning of the service</li>
            <li>Misrepresent the source or accuracy of data obtained from our service</li>
            <li>Use the service for any illegal or unauthorized purpose</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Data Accuracy</h2>
          <p className="text-gray-700">
            We strive to provide accurate information sourced from official
            government databases. However, we make no warranties about the
            completeness, reliability, or accuracy of this information. Data may
            be delayed or contain errors. Always verify important information
            through official government sources.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
          <p className="text-gray-700">
            The Democracy Watch platform, including its design, code, and
            documentation, is open source software. The underlying congressional
            data is public domain information from government sources. Our
            original analysis, visualizations, and presentation are provided under
            open source licenses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Disclaimer of Warranties</h2>
          <p className="text-gray-700">
            This service is provided &quot;as is&quot; and &quot;as available&quot;
            without warranties of any kind, either express or implied. We do not
            warrant that the service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
          <p className="text-gray-700">
            To the fullest extent permitted by law, Democracy Watch shall not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages arising from your use of the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
          <p className="text-gray-700">
            We reserve the right to modify these terms at any time. Changes will
            be effective immediately upon posting. Your continued use of the
            service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-gray-700">
            If you have questions about these terms, please{' '}
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
