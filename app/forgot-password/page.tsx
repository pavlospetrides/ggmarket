import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const initialStatus = status === "sent"
    ? "If an account exists, a reset link has been sent."
    : status === "failed"
      ? "The reset email could not be sent."
      : "";
  return <AuthShell title="Reset your password" subtitle="We'll email you a secure reset link."><ForgotPasswordForm initialStatus={initialStatus} /></AuthShell>;
}
