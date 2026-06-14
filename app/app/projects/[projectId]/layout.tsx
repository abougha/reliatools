import WorkspaceLayout from "@/components/appWorkspace/WorkspaceLayout";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <WorkspaceLayout projectId={projectId}>{children}</WorkspaceLayout>;
}
