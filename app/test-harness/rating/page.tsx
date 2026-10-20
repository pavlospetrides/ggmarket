import { notFound } from "next/navigation";
import { RatingHarness } from "./rating-harness";

export const dynamic = "force-dynamic";

export default function RatingHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <RatingHarness />;
}
