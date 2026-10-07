import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { LibraryManager } from "@/components/workspace/library-manager";
import { Suspense } from "react";
export default function LibraryPage() {
  return <AppShell modern><Topbar /><main className="px-4 py-6 md:px-8 md:py-8"><Suspense><LibraryManager /></Suspense></main></AppShell>;
}
