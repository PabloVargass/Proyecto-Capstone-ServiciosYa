import { notFound } from "next/navigation";
import {
  SummaryView,
  UsersView,
  RolesView,
  JobsView,
  CategoriesView,
  ReviewsView,
  AuditView,
} from "@/components/SectionViews";
const views = {
  resumen: SummaryView,
  usuarios: UsersView,
  roles: RolesView,
  trabajos: JobsView,
  categorias: CategoriesView,
  resenas: ReviewsView,
  auditoria: AuditView,
};
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in views)) notFound();
  const View = views[section as keyof typeof views];
  return <View />;
}
