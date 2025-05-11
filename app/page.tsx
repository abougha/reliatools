// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900">
      {/* Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 shadow-sm bg-white">
        <h1 className="text-xl font-bold tracking-tight text-blue-600">Reliatools</h1>
        <nav className="space-x-6 text-sm font-medium">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <Link href="/about" className="hover:text-blue-600">About</Link>
          <Link href="/tools" className="hover:text-blue-600">Tools</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="text-center py-24 px-6">
        <h2 className="text-4xl font-extrabold text-gray-800 leading-tight">
          Accelerate Reliability Engineering<br />
          with Powerful Tools and Insights
        </h2>
        <p className="mt-6 max-w-2xl mx-auto text-gray-600 text-lg">
          Reliatools offers calculators, test plans, and frameworks built for engineers,
          by engineers. Focused on speed, accuracy, and industry standards.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/tools" className="px-5 py-3 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700">
            Explore Tools
          </Link>
          <Link href="/about" className="px-5 py-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-semibold text-gray-800 mb-8">Why Reliatools?</h3>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div>
              <h4 className="font-bold text-blue-600 mb-2">🎯 Precision</h4>
              <p className="text-sm text-gray-600">Test plans and calculators based on proven reliability models like Arrhenius and Weibull.</p>
            </div>
            <div>
              <h4 className="font-bold text-blue-600 mb-2">🧠 Expert-Driven</h4>
              <p className="text-sm text-gray-600">Crafted by experienced reliability engineers for real-world applications.</p>
            </div>
            <div>
              <h4 className="font-bold text-blue-600 mb-2">⚡ Efficient</h4>
              <p className="text-sm text-gray-600">Accelerate validation and analysis with automation-ready tools.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
