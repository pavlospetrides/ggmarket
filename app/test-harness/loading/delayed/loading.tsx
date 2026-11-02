import { Loader2 } from "@/components/ui/loader-2";

export default function DelayedLoadingHarnessFallback() {
  return (
    <div className="container-page flex min-h-[55svh] items-center justify-center py-12">
      <Loader2 delayed label="Loading test content" />
    </div>
  );
}
