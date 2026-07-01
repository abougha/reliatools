import { redirect } from "next/navigation";

export function generateStaticParams() {
  return [{ projectId: "demo-project" }];
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/app/projects/${projectId}/overview`);
}
