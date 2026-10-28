import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

function isPrivateIpv4(address: string) {
  if (address.startsWith("10.") || address.startsWith("192.168.")) return true;
  const secondOctet = /^172\.(\d{1,2})\./.exec(address)?.[1];
  return secondOctet !== undefined && Number(secondOctet) >= 16 && Number(secondOctet) <= 31;
}

const localDevelopmentOrigins = [
  "127.0.0.1",
  ...Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal && isPrivateIpv4(address.address))
    .map((address) => address.address),
].filter((origin, index, origins) => origins.indexOf(origin) === index);

export function localSupabaseImagePattern(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) return null;
    return {
      protocol: "http" as const,
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/**",
    };
  } catch {
    return null;
  }
}

const localImagePattern = localSupabaseImagePattern(process.env.NEXT_PUBLIC_SUPABASE_URL);

const nextConfig: NextConfig = {
  allowedDevOrigins: localDevelopmentOrigins,
  devIndicators: false,
  images: {
    dangerouslyAllowLocalIP: Boolean(localImagePattern),
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      ...(localImagePattern ? [localImagePattern] : []),
    ],
  },
};

export default nextConfig;
