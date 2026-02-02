import Link from 'next/link';

export const metadata = {
  title: 'Contact | Democracy Watch',
  description: 'Get in touch with the Democracy Watch team',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href="/" className="text-primary-600 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>

        <p className="text-gray-700 mb-8">
          Have questions, feedback, or want to contribute to Democracy Watch?
          We&apos;d love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Report Issues</h2>
            <p className="text-gray-600 mb-4">
              Found a bug or have a feature request? Open an issue on GitHub.
            </p>
            <a
              href="https://github.com/democracy-watch/platform/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              Open an Issue &rarr;
            </a>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Contribute</h2>
            <p className="text-gray-600 mb-4">
              Want to help build Democracy Watch? Check out our contributor guide.
            </p>
            <a
              href="https://github.com/democracy-watch/platform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              View on GitHub &rarr;
            </a>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Data Corrections</h2>
            <p className="text-gray-600 mb-4">
              Notice incorrect data? Help us maintain accuracy by reporting it.
            </p>
            <a
              href="https://github.com/democracy-watch/platform/issues/new?template=data-correction.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              Report Data Issue &rarr;
            </a>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-3">General Inquiries</h2>
            <p className="text-gray-600 mb-4">
              For press, partnerships, or other inquiries.
            </p>
            <a
              href="mailto:hello@democracy.watch"
              className="text-primary-600 hover:underline font-medium"
            >
              hello@democracy.watch &rarr;
            </a>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Follow Us</h2>
          <p className="text-gray-600 mb-4">
            Stay updated on new features and civic data insights.
          </p>
          <div className="flex gap-4">
            <a
              href="https://twitter.com/democracywatch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-700 hover:text-brand-blue transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter
            </a>
            <a
              href="https://github.com/democracy-watch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
