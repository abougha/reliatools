// app/resources/[slug]/page.tsx
import { notFound } from "next/navigation";
import resourceData from "@/data/resources.json";
import ReactMarkdown from "react-markdown";
import ArrheniusArticle from "@/components/ArrheniusArticle";

interface Resource {
  slug: string;
  title: string;
  category: string;
  description: string;
  date: string;
  content: string;
}

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return resourceData.map((resource: Resource) => ({
    slug: resource.slug,
  }));
}

export default function ResourceDetailPage({ params }: PageProps) {
  const resource = resourceData.find((res) => res.slug === params.slug);

  if (!resource) return notFound();

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">{resource.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {resource.category} • {resource.date}
      </p>
      <p className="text-lg text-gray-700 mb-6">{resource.description}</p>
      <hr className="my-6" />

      <div className="prose prose-lg max-w-none">
        <ReactMarkdown>{resource.content}</ReactMarkdown>

        {resource.slug === "arrhenius-article" && (
          <ArrheniusArticle />
        )}

        {resource.slug === "microelectronics-case-study" && (
          <>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Failure Rate Graph (Coming Soon)</h2>
            {/* Placeholder for future graph components */}
          </>
        )}
      </div>
    </main>
  );
}
