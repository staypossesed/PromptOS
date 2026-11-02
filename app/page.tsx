import { StartExperience } from "@/components/builder/start-experience";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { Suspense } from "react";

export default function LandingPage() {
  return (
    <>
      <PageViewTracker event="landing_view" />
      <Suspense><StartExperience /></Suspense>
    </>
  );
}
