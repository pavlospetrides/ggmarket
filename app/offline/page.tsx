import Link from "next/link";
import { WifiOff } from "lucide-react";
export default function OfflinePage() { return <div className="container-page grid min-h-[65vh] place-items-center text-center"><div className="surface-panel max-w-md p-8 sm:p-10"><span className="empty-state-icon"><WifiOff /></span><h1 className="mt-5 text-2xl font-[850] tracking-tight">You&apos;re offline</h1><p className="mt-3 leading-6 text-[var(--muted)]">Reconnect to load current listings, messages, and offers.</p><Link href="/" className="btn-primary mt-6">Try again</Link></div></div>; }
