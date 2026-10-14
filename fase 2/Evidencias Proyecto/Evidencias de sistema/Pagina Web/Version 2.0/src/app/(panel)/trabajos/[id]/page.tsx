import { JobDetail } from "@/components/DetailViews";
export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <JobDetail id={(await params).id} />;
}
