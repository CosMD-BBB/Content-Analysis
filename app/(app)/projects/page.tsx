import { requireUser } from "@/src/auth/session";

export default async function ProjectsPage() {
  const u = await requireUser();
  return <div className="login"><p>สวัสดี {u.name}</p></div>;
}
