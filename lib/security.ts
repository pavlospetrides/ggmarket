export function safeRedirectPath(value: string | null, fallback = "/profile") { return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback; }
export function isAllowedImageFile(file: { type: string; size: number }) { return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10_485_760; }
export const JSON_BODY_LIMIT_BYTES = 65_536;
export const IMAGE_UPLOAD_BODY_LIMIT_BYTES = 10_485_760 + 65_536;

async function readLimitedText(request: Request, limit: number) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
  try {
    const body = await readLimitedText(request, JSON_BODY_LIMIT_BYTES);
    return body === null ? null : JSON.parse(body);
  } catch {
    return null;
  }
}

export async function readUrlEncodedForm(request: Request): Promise<URLSearchParams | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) return null;
  try {
    const body = await readLimitedText(request, JSON_BODY_LIMIT_BYTES);
    return body === null ? null : new URLSearchParams(body);
  } catch {
    return null;
  }
}

export async function readLimitedMultipartForm(request: Request): Promise<FormData | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data;")) return null;
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > IMAGE_UPLOAD_BODY_LIMIT_BYTES) return null;
  if (!request.body) return null;
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > IMAGE_UPLOAD_BODY_LIMIT_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type")! },
      body,
    }).formData();
  } catch {
    return null;
  }
}
