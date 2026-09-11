import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const, trailingSlash: true } : {}),
  ...(process.env.NEXT_PUBLIC_SHOWCASE_PREVIEW === "1" ? { distDir: ".next-preview" } : {}),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: { unoptimized: true },
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
