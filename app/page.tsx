import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { listMyProjects } from "@/src/projects/service";

export default async function Home() {
  const user = await requireUser();
  const projects = await listMyProjects(getDb(), user.id);
  if (!projects.length) redirect(user.isSuperAdmin ? "/projects" : "/waiting");
  const last = (await cookies()).get("cs_last_project")?.value;
  const target = projects.find((p) => p.id === last) ?? projects[0];
  redirect(`/p/${target.id}`);
}
