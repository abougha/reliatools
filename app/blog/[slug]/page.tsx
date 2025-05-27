import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

interface BlogPageProps {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export async function generateStaticParams() {
  const files = fs.readdirSync(path.join(process.cwd(), "blog"));
  return files.map((file) => ({ slug: file.replace(".md", "") }));
}

export default async function BlogPost({ params }: BlogPageProps) {
  const filePath = path.join(process.cwd(), "blog", `${params.slug}.md`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(fileContent);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{data.title}</h1>
      {data.date && <p className="text-sm text-gray-500 mb-4">{data.date}</p>}
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </main>
  );
}
