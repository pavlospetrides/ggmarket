import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileMediaEditor } from "@/components/profile-media-editor";
import { ProfileMediaImage } from "@/components/profile-media-image";

export default async function ProfileMediaHarness() {
  if (process.env.E2E_UI_HARNESS !== "1") notFound();
  const jar = await cookies();
  const date = jar.get("profile-harness-fresh")?.value === "1" ? "20990101T000000Z" : "20200101T000000Z";
  const avatarUrl = jar.get("profile-harness-avatar")?.value === "1" ? `/test-harness/profile-image?kind=avatar&X-Amz-Date=${date}&X-Amz-Expires=3600` : undefined;
  const coverUrl = jar.get("profile-harness-cover")?.value === "1" ? "/test-harness/profile-image?kind=cover" : undefined;
  return <div className="container-page max-w-4xl py-8">
    <section className="profile-identity-stage card overflow-hidden" aria-labelledby="harness-name">
      <div data-profile-region="banner" className="relative h-24 overflow-hidden bg-[#1b2030] sm:h-36">
        <div className="absolute inset-y-0 left-0 w-2/3 bg-[#28234a] opacity-70" />
        {coverUrl ? <ProfileMediaImage src={coverUrl} alt="" sizes="100vw" className="object-cover" /> : null}
        <ProfileMediaEditor kind="cover" currentUrl={coverUrl} triggerClassName="btn-secondary absolute right-3 top-3 z-10 min-h-11" />
      </div>
      <div className="flex min-w-0 items-end gap-4 px-4 pb-6 sm:px-7">
        <div className="relative -mt-8 shrink-0"><ProfileAvatar name="Sample Seller" url={avatarUrl} className="size-20 border-4 border-[#131924] text-2xl sm:size-24" /><ProfileMediaEditor kind="avatar" currentUrl={avatarUrl} compact triggerClassName="absolute -bottom-1 -right-1 grid size-11 place-items-center rounded-full bg-[var(--primary)]" /></div>
        <div className="min-w-0"><h1 id="harness-name" className="break-words text-2xl font-bold">Sample Seller</h1><p className="text-sm text-[var(--muted)]">@sample_seller</p></div>
      </div>
    </section>
  </div>;
}
