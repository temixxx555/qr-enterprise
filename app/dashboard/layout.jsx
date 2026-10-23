import Workspace from "@/components/Workspace";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { context } from "@/lib/server/access.mjs";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }) {
  let ctx;
  try {
    ctx = await context(await headers());
  } catch (error) {
    if (error.status === 401) redirect("/login");
    if (error.status === 403) redirect("/onboarding");
    throw error;
  }
  return (
    <Workspace
      user={{ name: ctx.user.name }}
      organization={{ name: ctx.organization.name }}
      role={ctx.membership.role}
    >
      {children}
    </Workspace>
  );
}
