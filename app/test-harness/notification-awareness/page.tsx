import { notFound } from "next/navigation";
import { NotificationAwarenessHarness } from "@/components/notification-awareness-harness";

export default async function NotificationAwarenessHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ active?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const { active } = await searchParams;
  return <NotificationAwarenessHarness initiallyActive={active !== "0"} />;
}
