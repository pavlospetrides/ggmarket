import { notFound } from "next/navigation";
import { NotificationHarness } from "@/components/notification-harness";

export const dynamic = "force-dynamic";

export default function NotificationHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <main className="container-page py-10"><NotificationHarness /></main>;
}
