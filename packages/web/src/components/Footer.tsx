import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-100 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Democracy Watch</h3>
            <p className="text-gray-600 text-sm">
              Making congressional accountability transparent and accessible.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Links</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-gray-900"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>Congress.gov</li>
              <li>Federal Election Commission</li>
              <li>OpenSecrets.org</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Democracy Watch. Open source civic tech.
        </div>
      </div>
    </footer>
  );
}
