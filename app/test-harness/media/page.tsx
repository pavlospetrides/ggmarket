import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ListingMediaImage } from "@/components/listing-media-image";

export default async function MediaHarness() {
  if (process.env.E2E_UI_HARNESS !== "1") notFound();
  const fresh = (await cookies()).get("media-refresh-fresh")?.value === "1";
  const date = fresh ? "20990101T000000Z" : "20200101T000000Z";
  return <main><h1>Signed media test</h1><ListingMediaImage src={`/test-harness/media-image?X-Amz-Date=${date}&X-Amz-Expires=3600`} alt="Private listing fixture" width={100} height={100} /></main>;
}
