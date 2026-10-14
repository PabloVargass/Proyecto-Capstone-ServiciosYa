import { UserDetail } from "@/components/DetailViews";
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <UserDetail id={(await params).id} />;
}
