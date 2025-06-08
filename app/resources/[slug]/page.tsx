import { notFound } from "next/navigation";
import resourceData from "@/data/resources.json";
import ArrheniusArticle from "@/app/resources/arrhenius-article";
import ThermalShockArticle from "@/app/resources/thermal-shock-article";

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

  if (params.slug === "arrhenius-article") return <ArrheniusArticle />;
  if (params.slug === "thermal-shock-article") return <ThermalShockArticle />;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">{resource.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {resource.category} • {resource.date}
      </p>
      <p className="text-lg text-gray-700 mb-6">{resource.description}</p>
    </main>
  );
}
