import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const dynamic = "force-dynamic";

export default function PasswordInteractionHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <main className="container-page py-8"><ResetPasswordForm /></main>;
}
