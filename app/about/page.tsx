// app/about/page.tsx

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 py-20 px-6">
      <section className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
          About <span className="text-blue-600">Reliatools</span>
        </h1>
        <p className="text-lg text-gray-700 mb-10">
          Reliatools is built for reliability engineers, by reliability engineers.
          We help you simplify testing, accelerate validation, and bring data-driven decisions into product development.
        </p>
      </section>

      <section className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-3 text-left px-6">
        <div>
          <h3 className="text-blue-600 font-bold text-lg mb-2">🎯 Mission</h3>
          <p className="text-sm text-gray-600">
            Empower reliability professionals with intuitive tools for planning, testing, and analyzing.
          </p>
        </div>
        <div>
          <h3 className="text-blue-600 font-bold text-lg mb-2">🌐 Vision</h3>
          <p className="text-sm text-gray-600">
            Create the leading platform for engineering-grade reliability insights and automation.
          </p>
        </div>
        <div>
          <h3 className="text-blue-600 font-bold text-lg mb-2">🧠 Expertise</h3>
          <p className="text-sm text-gray-600">
            Created by industry leaders with decades of experience in validation, testing, and design-for-reliability (DfR).
          </p>
        </div>
      </section>
    </main>
  );
}
