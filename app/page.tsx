// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 sm:py-32">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight max-w-3xl">
          Engineering-Grade Tools for <span className="text-blue-600">Reliability</span> & <span className="text-blue-600">Validation</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-xl">
          Reliatools empowers engineers with calculators, planning frameworks, and technical insights for product durability, efficiency, and testing excellence.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            href="/tools"
            className="inline-block px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-md shadow-md transition"
          >
            Explore Tools
          </Link>
          <Link
            href="/about"
            className="inline-block px-6 py-3 text-blue-600 border border-blue-600 hover:bg-blue-50 font-medium rounded-md transition"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 px-6 sm:px-12 border-t">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-12">Why Reliatools?</h2>
          <div className="grid gap-10 sm:grid-cols-3 text-left">
            <div>
              <h3 className="text-blue-600 font-bold text-lg mb-2">🎯 Precision</h3>
              <p className="text-sm text-gray-600">
                Industry-aligned tools using proven models like Arrhenius and Weibull to guide technical decisions.
              </p>
            </div>
            <div>
              <h3 className="text-blue-600 font-bold text-lg mb-2">🧠 Expert-Driven</h3>
              <p className="text-sm text-gray-600">
                Built by engineers with decades of reliability testing experience, embedded with real-world insights.
              </p>
            </div>
            <div>
              <h3 className="text-blue-600 font-bold text-lg mb-2">⚡ Efficiency</h3>
              <p className="text-sm text-gray-600">
                Designed to accelerate validation, reduce test redundancy, and increase confidence in design decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
