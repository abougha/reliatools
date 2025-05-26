import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";

export default function BlogIndex() {
  const blogDir = path.join(process.cwd(), "blog");
  const files = fs.readdirSync(blogDir);

  const posts = files.map((file) => {
    const content = fs.readFileSync(path.join(blogDir, file), "utf-8");
    const { data } = matter(content);
    const slug = file.replace(".md", "");

    return { title: data.title || slug, date: data.date || "", slug };
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">Reliatools Blog</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="text-blue-600 hover:underline">
              {post.title}
            </Link>
            <p className="text-sm text-gray-500">{post.date}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
