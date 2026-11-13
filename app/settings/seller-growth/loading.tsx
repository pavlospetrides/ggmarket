import { Loader2 } from "@/components/ui/loader-2";

export default function Loading() {
  return <main className="container-page max-w-3xl py-8 md:py-12" aria-busy="true">
    <Loader2 delayed label="Loading seller verification" />
    <div className="mt-8 card p-5 sm:p-7" aria-hidden="true">
      <div className="skeleton h-7 w-64 max-w-full rounded-lg" />
      <div className="skeleton mt-5 h-4 w-full rounded" />
      <div className="skeleton mt-3 h-4 w-4/5 rounded" />
      <div className="skeleton mt-8 h-32 rounded-xl" />
    </div>
  </main>;
}
