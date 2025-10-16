"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface Tool {
  id: string;
  title: string;
  route: string;
  description: string;
  formulaLatex: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    fetch("/tools.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setTools(data))
      .catch((err) => console.error("Failed to fetch tools:", err));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Reliability Tools</h1>

      {tools.length === 0 ? (
        <p className="text-center text-gray-500">No tools found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white shadow-md rounded-2xl p-6 border hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
              <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
              <div className="bg-gray-100 p-2 rounded">
                <BlockMath math={tool.formulaLatex} />
              </div>
              <Link
                href={tool.route}
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
