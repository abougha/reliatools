import Link from 'next/link';

export default function ToolsIndex() {
  const tools = [
    {
      name: 'Arrhenius Life Calculator',
      description: 'Estimate acceleration factor and equivalent lifetime using the Arrhenius equation.',
      path: '/tools/Arrhenius',
    },
    // Add more tools here as you build them
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Reliability Engineering Tools</h1>
      <p className="text-gray-700 mb-8">
        Explore a suite of calculators and engineering utilities tailored for reliability engineers. Each tool is designed to help accelerate testing, improve product validation, and streamline design decisions.
      </p>

      <div className="grid gap-6">
        {tools.map((tool, index) => (
          <div key={index} className="border p-4 rounded-xl shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">{tool.name}</h2>
            <p className="text-gray-600 mb-3">{tool.description}</p>
            <Link href={tool.path} className="text-blue-600 hover:underline">
              Go to Tool →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
