// app/resources/[slug]/page.tsx
import { notFound } from "next/navigation";
import resourceDataRaw from "@/data/resources.json";
import ArrheniusArticle from "@/app/resources/arrhenius-article";
import ThermalShockArticle from "@/app/resources/thermal-shock-article";
import HALTArticle from "@/app/resources/halt";
import SoftwareBRPArticle from "@/app/resources/SoftwareBRP-article";
import TaguchiBayesianArticle from "@/app/resources/taguchi-bayesian-article";
import Derating from "@/app/resources/derating";
import ContactCTA from "@/components/ContactCTA";


type Resource = {
  slug: string;
  title: string;
  category: string;
  description: string;
  date: string;
  content?: string;
  link?: string;
};

const resourceData = resourceDataRaw as Resource[];


// (Optional) per-page SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const safeSlug = decodeURIComponent(slug).toLowerCase();
  const res = resourceData.find((r) => r.slug.toLowerCase() === safeSlug);
  const title = res?.title ?? "Resource";
  const description = res?.description ?? "Resource details";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.reliatools.com/resources/${slug}`,
      siteName: "Reliatools",
      type: "article",
    },
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const safeSlug = decodeURIComponent(slug).toLowerCase();

  const resource = resourceData.find((r) => r.slug.toLowerCase() === safeSlug);
  if (!resource) return notFound();

  // Route to your React articles
  if (safeSlug === "arrhenius-article") return <ArrheniusArticle />;
  if (safeSlug === "thermal-shock-article") return <ThermalShockArticle />;
  if (safeSlug === "halt") return <HALTArticle />;
  if (safeSlug === "softwarebrp-article") return <SoftwareBRPArticle />;
  if (safeSlug === "taguchi-bayesian-article") return <TaguchiBayesianArticle />;
  if (safeSlug === "derating") return <Derating />;

  // Fallback renderer for JSON-defined content
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">{resource.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {resource.category} • {resource.date}
      </p>
      <p className="text-lg text-gray-700 mb-6">{resource.description}</p>
      <ContactCTA variant="article" />
    </main>
  );
}
