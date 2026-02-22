// components/ResourceCard.tsx
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface ResourceCardProps {
  slug: string;
  title: string;
  category: string;
  description: string;
  date: string;
  content: string;
  image?: string;
  link?: string;
}

export default function ResourceCard({
  slug,
  title,
  category,
  description,
  date,
  image,
  link,
}: ResourceCardProps) {
  const href = link ?? `/resources/${slug}`;

  return (
    <Card className="rounded-2xl p-4 transition hover:shadow-lg">
      <CardContent className="space-y-2">
        {image ? (
          <div className="mb-2 overflow-hidden rounded-xl border">
            <Image
              src={image}
              alt={title}
              width={1200}
              height={675}
              className="h-auto w-full"
            />
          </div>
        ) : null}
        <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase text-blue-600">
          {category}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-gray-600">{description}</p>
        <p className="text-sm text-gray-400">{date}</p>
        <Link
          href={href}
          className="mt-2 inline-block font-medium text-blue-500 hover:underline"
        >
          View Resource {"->"}
        </Link>
      </CardContent>
    </Card>
  );
}
