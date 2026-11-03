import { Suspense } from "react";
import { StartExperience } from "@/components/builder/start-experience";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
export const metadata={title:"Write a clear message — Umprompt",description:"Turn what you want to say into clear instructions for your AI assistant. Try a task without an account."};
export default function MessagePage(){return <><PageViewTracker event="landing_view"/><Suspense><StartExperience campaign="email"/></Suspense></>;}
