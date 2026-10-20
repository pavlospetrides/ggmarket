import { NotificationsList } from "@/components/notifications-list";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/phase2-data";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await getNotifications(user.id);
  return <div className="container-page min-w-0 max-w-3xl pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Updates" title="Notifications" description="Offers, messages, listing activity, and saved-search alerts in one place." variant="communication" meta={<span>{items.length} recent signals</span>} />
    <NotificationsList initial={items} />
  </div>;
}
