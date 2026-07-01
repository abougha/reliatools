import { notFound } from "next/navigation";
import StepContent from "@/components/appWorkspace/StepContent";
import { getWorkflowStep, workflowSteps } from "@/lib/appWorkspace/mockData";

export function generateStaticParams() {
  return workflowSteps.map((step) => ({
    projectId: "demo-project",
    step: step.id,
  }));
}

export default async function ProjectWorkflowStepPage({
  params,
}: {
  params: Promise<{ projectId: string; step: string }>;
}) {
  const { projectId, step } = await params;

  if (!getWorkflowStep(step)) {
    notFound();
  }

  return <StepContent projectId={projectId} stepId={step} />;
}
