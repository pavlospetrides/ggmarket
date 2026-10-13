export function safeRedirectPath(value: string | null, fallback = "/profile") { return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback; }
export function isAllowedImageFile(file: { type: string; size: number }) { return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10_485_760; }
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
  try { return await request.json(); } catch { return null; }
}
