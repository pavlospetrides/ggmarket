export function safeRedirectPath(value: string | null, fallback = "/profile") { return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback; }
export function isAllowedImageFile(file: { type: string; size: number }) { return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10_485_760; }
