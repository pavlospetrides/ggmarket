import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { requireUser } from "@/lib/auth";
export default async function ResetPasswordPage() { await requireUser("/reset-password"); return <AuthShell title="Choose a new password" subtitle="Use at least eight characters."><ResetPasswordForm /></AuthShell>; }
