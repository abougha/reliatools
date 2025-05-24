// app/about/page.tsx
import Link from "next/link";


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 dark:from-black dark:via-gray-900 dark:to-gray-800 dark:text-white px-6 py-16">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold sm:text-5xl mb-4">
          About <span className="text-blue-600">Reliatools</span>
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Empowering reliability engineers with tools that simplify testing, planning, and validation.
        </p>
      </section>

      {/* Mission */}
      <section className="mt-16 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="text-gray-600 dark:text-gray-400 text-md leading-relaxed">
          We believe reliability engineering deserves tools as rigorous as the work it supports. Reliatools is built to help professionals accelerate validation cycles, reduce redundant testing, and make confident, data-driven design decisions.
        </p>
      </section>

      {/* Features */}
      <section className="mt-20 grid sm:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
        <div>
          <h3 className="text-lg font-bold text-blue-600 mb-2">🎯 Engineering Precision</h3>
          <p className="text-sm text-gray-700 dark:text-gray-400">
            Built around proven reliability models like Arrhenius and Weibull to guide technical accuracy.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-600 mb-2">🧠 Expert Experience</h3>
          <p className="text-sm text-gray-700 dark:text-gray-400">
            Created by engineers with decades of industry experience in validation, testing, and product development.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-600 mb-2">⚡ Speed & Efficiency</h3>
          <p className="text-sm text-gray-700 dark:text-gray-400">
            Optimized to streamline reliability workflows and eliminate guesswork.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="mt-16 text-center">
        <Link
          href="/tools"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 transition"
        >
          Explore Tools
        </Link>
      </section>
    </div>
  );
}
