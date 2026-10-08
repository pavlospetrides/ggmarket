import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
export default function ForgotPasswordPage() { return <AuthShell title="Reset your password" subtitle="We'll email you a secure reset link."><ForgotPasswordForm /></AuthShell>; }
