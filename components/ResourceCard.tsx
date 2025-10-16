// components/ResourceCard.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface ResourceCardProps {
  slug: string;
  title: string;
  category: string;
  description: string;
  date: string;
  content: string;
}

export default function ResourceCard({
  slug,
  title,
  category,
  description,
  date,
}: ResourceCardProps) {
  return (
    <Card className="hover:shadow-lg transition rounded-2xl p-4">
      <CardContent className="space-y-2">
        <span className="inline-block text-xs font-semibold uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
          {category}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-gray-600">{description}</p>
        <p className="text-gray-400 text-sm">{date}</p>
        <Link
          href={`/resources/${slug}`}
          className="text-blue-500 hover:underline font-medium inline-block mt-2"
        >
          View Resource →
        </Link>
      </CardContent>
    </Card>
  );
}

