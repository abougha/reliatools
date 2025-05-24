import Link from "next/link";
export const metadata = {
  title: "Reliatools | Reliability Engineering Tools for Testing & Analysis",
  description: "Free online calculators for reliability engineers: Arrhenius, Coffin-Manson, Sample Size, and more. Boost your reliability testing efficiency.",
  keywords: ["Reliability Engineering", "Arrhenius Calculator", "Coffin-Manson Model", "Sample Size Calculator", "Reliability Tools"],
  openGraph: {
    title: "Reliatools | Free Tools for Reliability Engineers",
    description: "Reliatools provides free online calculators for reliability testing and analysis, including Arrhenius, Coffin-Manson, Sample Size, and more.",
    url: "https://www.reliatools.com/",
    siteName: "Reliatools",
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: "https://www.reliatools.com/",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100">
     
            {/* Hero Section */}
      <section className="text-center px-6 py-20 sm:py-28">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 max-w-4xl mx-auto leading-tight">
          Accelerate Reliability Engineering with Powerful Tools and Insights
        </h2>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          Reliatools offers calculators, test plans, and frameworks built for engineers, by engineers,
          Focused on speed, accuracy, and industry standards.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/tools"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 transition"
          >
            Explore Tools
          </Link>
          <Link
            href="/about"
            className="px-6 py-3 border border-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-100 transition"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Feature Section */}
      <section className="bg-white border-t py-16 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-12">Why Reliatools?</h3>
          <div className="grid sm:grid-cols-3 gap-10 text-left">
            <div>
              <h4 className="text-blue-600 text-lg font-bold mb-2">🔵 Precision</h4>
              <p className="text-gray-600 text-sm">
                Test plans and calculators based on proven reliability models like Arrhenius and Weibull.
              </p>
            </div>
            <div>
              <h4 className="text-blue-600 text-lg font-bold mb-2">🔵 Expert-Driven</h4>
              <p className="text-gray-600 text-sm">
                Crafted by experienced reliability engineers for real-world applications.
              </p>
            </div>
            <div>
              <h4 className="text-blue-600 text-lg font-bold mb-2">🔵 Efficient</h4>
              <p className="text-gray-600 text-sm">
                Accelerate validation and analysis with automation-ready tools.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
