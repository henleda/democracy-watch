import Image from 'next/image';
import { ZipSearch } from '@/components/ZipSearch';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section with Logo */}
      <section className="bg-gradient-to-b from-brand-navy via-primary-800 to-primary-900 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8">
            <Image
              src="/logo.webp"
              alt="Democracy Watch"
              width={180}
              height={180}
              className="mx-auto drop-shadow-2xl"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Know How Your Representatives Vote
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
            Track congressional voting records, compare actions to promises, and
            see who funds your elected officials.
          </p>
          <div className="max-w-md mx-auto">
            <ZipSearch />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="card border-t-4 border-t-brand-blue hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-brand-navy">Voting Records</h2>
          <p className="text-gray-600">
            See how your representatives voted on every bill. Filter by topic,
            date, or party line votes.
          </p>
        </div>
        <div className="card border-t-4 border-t-brand-gold hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-brand-navy">Promise Tracking</h2>
          <p className="text-gray-600">
            We correlate campaign promises with actual votes to show you who
            keeps their word.
          </p>
        </div>
        <div className="card border-t-4 border-t-brand-red hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-brand-red/10 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-brand-navy">Follow the Money</h2>
          <p className="text-gray-600">
            See who funds your representatives and whether their votes align
            with donor interests.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="text-center bg-gray-50 -mx-4 px-4 py-12 rounded-lg">
        <h2 className="text-2xl font-bold mb-8 text-brand-navy">How It Works</h2>
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold shadow-md">
              1
            </span>
            <span className="text-gray-700 font-medium">Enter your ZIP code</span>
          </div>
          <svg className="hidden md:block w-6 h-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold shadow-md">
              2
            </span>
            <span className="text-gray-700 font-medium">Find your representatives</span>
          </div>
          <svg className="hidden md:block w-6 h-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold shadow-md">
              3
            </span>
            <span className="text-gray-700 font-medium">Track their votes</span>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
