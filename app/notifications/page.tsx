import { NotificationsList } from "@/components/notifications-list";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/phase2-data";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await getNotifications(user.id);
  return <div className="container-page min-w-0 max-w-3xl pb-28 pt-8 md:pb-12 md:pt-12">
    <div className="page-header min-w-0"><p className="eyebrow">Updates</p><h1 className="page-title">Notifications</h1><p className="page-description">Offers, messages, listing activity, and saved-search alerts in one place.</p></div>
    <NotificationsList initial={items} />
  </div>;
}
