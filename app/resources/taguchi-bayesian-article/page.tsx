import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import TaguchiBayesianArticle from "@/app/resources/taguchi-bayesian-article";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/resources/taguchi-bayesian-article/"],
  description:
    "How to combine Taguchi design of experiments, Bayesian inference, and Monte Carlo simulation for smarter reliability validation planning. A practical approach to optimizing test strategy and coverage.",
  openGraph: {
    title: ogTitle("/resources/taguchi-bayesian-article/"),
    description:
      "Combine Taguchi DOE, Bayesian inference, and Monte Carlo simulation for smarter reliability validation planning and test strategy optimization.",
    url: "https://www.reliatools.com/resources/taguchi-bayesian-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/taguchi-bayesian-article" },
};

export default function TaguchiBayesianArticlePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "Hybrid Test Planning: Taguchi + Bayesian + Monte Carlo",
          description:
            "A practical guide to combining Taguchi DOE with in-situ Bayesian updating and Monte Carlo reasoning to create adaptive, confidence-driven validation plans.",
          path: "/resources/taguchi-bayesian-article",
          datePublished: "2025-12-24",
        })}
      />
      <TaguchiBayesianArticle />
    </>
  );
}
