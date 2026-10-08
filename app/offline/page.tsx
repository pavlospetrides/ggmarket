import Link from "next/link";
import { WifiOff } from "lucide-react";
export default function OfflinePage() { return <div className="container-page grid min-h-[65vh] place-items-center text-center"><div className="card max-w-md p-10"><WifiOff className="mx-auto size-10 text-[#aa98ff]" /><h1 className="mt-4 text-2xl font-black">You&apos;re offline</h1><p className="mt-3 text-[var(--muted)]">Reconnect to load current listings, messages, and offers.</p><Link href="/" className="btn-primary mt-6">Try again</Link></div></div>; }
