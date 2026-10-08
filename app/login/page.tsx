import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export default async function LoginPage() { if (await getUser()) redirect("/profile"); return <AuthShell title="Welcome back" subtitle="Pick up where you left off."><Suspense><AuthForm mode="login" /></Suspense></AuthShell>; }
