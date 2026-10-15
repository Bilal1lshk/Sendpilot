import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export const metadata = {
  title: "Dashboard | SendPilot LinkedIn CRM",
  description: "AI-powered LinkedIn outreach, lead database, and campaign management.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();
  const workspace = await Workspace.findOne({ userId: session.user.id });

  // Enforce onboarding: user must complete their campaign steps and create their workspace
  const isWorkspaceReady =
    workspace &&
    (workspace.onboardingCompleted ||
      (workspace.name && workspace.name !== "Default Workspace" && workspace.step4?.status === "completed"));

  if (!isWorkspaceReady) {
    redirect("/get-started");
  }

  return (
    <div className="dark bg-black text-neutral-100 min-h-screen">
      <DashboardShell user={session.user}>
        {children}
      </DashboardShell>
    </div>
  );
}
