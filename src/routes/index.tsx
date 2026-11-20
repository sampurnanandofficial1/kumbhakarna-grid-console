import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kumbhakarna Grid-Edge Console" },
      { name: "description", content: "Kumbhakarna Grid-Edge Console prototype." },
      { property: "og:title", content: "Kumbhakarna Grid-Edge Console" },
      { property: "og:description", content: "Kumbhakarna Grid-Edge Console prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
      <h1 className="text-3xl font-semibold text-foreground">Kumbhakarna Grid-Edge Console</h1>
      <p className="text-muted-foreground">Prototype loading</p>
    </main>
  );
}
