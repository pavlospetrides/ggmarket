"use client";

import { useState } from "react";
import { RateUserDialog } from "@/components/rate-user-dialog";
import type { Review } from "@/lib/types";

export function RatingHarness() {
  const [result, setResult] = useState<{ review: Review; summary: { average: number; count: number } } | null>(null);
  return <main className="container-page max-w-xl py-10"><section className="card p-6"><h1 className="text-xl font-bold">Test Seller</h1><p className="my-4" role="status">{result ? `${result.summary.average.toFixed(1)} / 5 — ${result.summary.count} rating` : "No ratings yet"}</p><RateUserDialog sellerId="22222222-2222-4222-8222-222222222222" sellerName="Test Seller" onSaved={setResult} /></section></main>;
}
