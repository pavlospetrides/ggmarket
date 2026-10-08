import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Create account", robots: { index: false } };
export default async function RegisterPage() { if (await getUser()) redirect("/profile"); return <AuthShell title="Join GGMarket" subtitle="Your next upgrade starts here."><Suspense><AuthForm mode="register" /></Suspense></AuthShell>; }
