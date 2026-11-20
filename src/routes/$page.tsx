import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageScreen } from "../components/kumbha/pages";
import { getPageTitle, isPageId } from "./page-ids";

function Pending() {
  return (
    <main className="page-container">
      <div className="skeleton-title" />
      <div className="skeleton-card" />
    </main>
  );
}

function PageRoute() {
  const { page } = Route.useParams();
  if (!isPageId(page)) throw notFound();
  return <PageScreen page={page} />;
}

export const Route = createFileRoute("/$page")({
  ssr: false,
  pendingComponent: Pending,
  head: ({ params }) => ({
    meta: [
      { title: "Kumbhakarna | " + getPageTitle(params.page) },
      { name: "description", content: "Kumbhakarna Grid-Edge Console prototype." },
    ],
  }),
  component: PageRoute,
});
