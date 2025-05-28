"use client";

import { useState, useMemo } from "react";
import resourceData from "@/data/resources.json";
import ResourceCard from "@/components/ResourceCard";

interface Resource {
  slug: string;
  title: string;
  category: string;
  description: string;
  date: string;
  content: string;
}

export default function ResourcesPage() {
  const resources: Resource[] = resourceData;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const resourcesPerPage = 6;

  const filteredResources = useMemo(() => {
    return resources
      .filter((res) =>
        (filterCategory === "All" || res.category === filterCategory) &&
        (res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          res.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [searchQuery, filterCategory, resources]);

  const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * resourcesPerPage,
    currentPage * resourcesPerPage
  );

  const categories = ["All", ...new Set(resources.map((res) => res.category))];

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">Resources</h1>
      <p className="mb-6 text-gray-600 text-lg">
        Explore articles, case studies, infographics, white papers, and presentations curated for reliability engineers.
      </p>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded-md p-2 w-full md:w-1/2"
        />

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded-md p-2 w-full md:w-1/4"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {paginatedResources.length === 0 ? (
        <p className="text-gray-500">No resources found. Try adjusting your search or filter.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedResources.map((resource, index) => (
            <ResourceCard key={index} {...resource} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
