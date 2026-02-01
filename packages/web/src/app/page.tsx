import { ZipSearch } from '@/components/ZipSearch';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Know How Your Representatives Vote
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Track congressional voting records, compare actions to promises, and
          see who funds your elected officials.
        </p>
        <ZipSearch />
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="card">
          <div className="text-3xl mb-4">🗳️</div>
          <h2 className="text-xl font-semibold mb-2">Voting Records</h2>
          <p className="text-gray-600">
            See how your representatives voted on every bill. Filter by topic,
            date, or party line votes.
          </p>
        </div>
        <div className="card">
          <div className="text-3xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">Promise Tracking</h2>
          <p className="text-gray-600">
            We correlate campaign promises with actual votes to show you who
            keeps their word.
          </p>
        </div>
        <div className="card">
          <div className="text-3xl mb-4">💰</div>
          <h2 className="text-xl font-semibold mb-2">Follow the Money</h2>
          <p className="text-gray-600">
            See who funds your representatives and whether their votes align
            with donor interests.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="text-center">
        <h2 className="text-2xl font-bold mb-8">How It Works</h2>
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
              1
            </span>
            <span className="text-gray-700">Enter your ZIP code</span>
          </div>
          <span className="hidden md:block text-gray-400">→</span>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
              2
            </span>
            <span className="text-gray-700">Find your representatives</span>
          </div>
          <span className="hidden md:block text-gray-400">→</span>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
              3
            </span>
            <span className="text-gray-700">Track their votes</span>
          </div>
        </div>
      </section>
    </div>
  );
}
