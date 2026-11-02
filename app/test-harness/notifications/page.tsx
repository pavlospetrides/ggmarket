import { notFound } from "next/navigation";
import { NotificationHarness } from "@/components/notification-harness";

export const dynamic = "force-dynamic";

export default async function NotificationHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const { list } = await searchParams;
  return <main className="container-page py-10"><NotificationHarness showList={list === "1"} /></main>;
}
