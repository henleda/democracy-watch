import Image from 'next/image';
import { ZipSearch } from '@/components/ZipSearch';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Democracy Watch - They Work For You"
              width={400}
              height={200}
              className="mx-auto"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto">
            Hold Your Representatives{' '}
            <span className="text-brand-red">Accountable</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Track congressional voting records, compare actions to campaign promises,
            and follow the money behind every vote.
          </p>
          <div className="max-w-md mx-auto">
            <ZipSearch />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-brand-blue py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-3xl md:text-4xl font-bold">535</div>
              <div className="text-blue-200 text-sm">Members Tracked</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">15K+</div>
              <div className="text-blue-200 text-sm">Bills Analyzed</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">260K+</div>
              <div className="text-blue-200 text-sm">Votes Recorded</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">$B+</div>
              <div className="text-blue-200 text-sm">Contributions Tracked</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            <span className="text-brand-red">Transparency</span>{' '}
            <span className="text-brand-blue">Tools</span>
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to understand how your elected officials really vote
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Voting Records */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-l-brand-blue hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Voting Records</h3>
              <p className="text-gray-600">
                See every vote your representatives cast. Filter by topic,
                date, or party-line votes to understand their true priorities.
              </p>
            </div>

            {/* Promise Tracking */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-l-brand-orange hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Promise Tracking</h3>
              <p className="text-gray-600">
                We compare campaign promises against actual votes using AI
                to show you who keeps their word—and who doesn&apos;t.
              </p>
            </div>

            {/* Follow the Money */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-l-brand-red hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Follow the Money</h3>
              <p className="text-gray-600">
                See who funds your representatives by industry and find patterns
                between donations and votes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It <span className="text-brand-blue">Works</span>
          </h2>

          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-brand-red text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Enter ZIP Code</h3>
                <p className="text-gray-600 text-sm max-w-[200px]">
                  Find your representatives instantly
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:block">
                <svg className="w-12 h-12 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-brand-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Explore Records</h3>
                <p className="text-gray-600 text-sm max-w-[200px]">
                  View votes, promises, and funding
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:block">
                <svg className="w-12 h-12 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-brand-red text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Stay Informed</h3>
                <p className="text-gray-600 text-sm max-w-[200px]">
                  Track accountability scores
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to hold your reps{' '}
            <span className="text-brand-red">accountable</span>?
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Join thousands of citizens tracking their representatives&apos; voting records and campaign promises.
          </p>
          <div className="max-w-md mx-auto">
            <ZipSearch />
          </div>
        </div>
      </section>
    </div>
  );
}
