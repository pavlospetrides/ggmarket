import { NotificationsList } from "@/components/notifications-list";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/phase2-data";
export default async function NotificationsPage() { const user = await requireUser("/notifications"); const items = await getNotifications(user.id); return <div className="container-page max-w-3xl py-8 md:py-12"><p className="eyebrow">Updates</p><h1 className="mt-2 text-3xl font-black">Notifications</h1><div className="mt-8"><NotificationsList initial={items} /></div></div>; }
