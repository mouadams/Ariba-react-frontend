import { createFileRoute } from "@tanstack/react-router";
import { AppProvider, useApp } from "@/context/app-context";
import { GuestView } from "@/components/GuestView";
import { Dashboard } from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ERP Ariba Platform — Enterprise Data Engine" },
      { name: "description", content: "Premium enterprise platform for SAP Ariba data extraction, AI-assisted mapping and reconciliation." },
      { property: "og:title", content: "ERP Ariba Platform" },
      { property: "og:description", content: "Enterprise data extraction and processing for SAP Ariba workflows." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppProvider>
      <Shell />
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}

function Shell() {
  return <Dashboard />;
}
