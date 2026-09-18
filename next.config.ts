import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    const baseUrl = process.env.APP_BASE_URL ?? process.env.RAROLEADS_BASE_URL;
    if (!baseUrl) return [];

    try {
      const canonical = new URL(baseUrl);
      if (canonical.hostname !== "localhost") return [];

      return [{
        source: "/:path*",
        has: [{ type: "host" as const, value: "127.0.0.1" }],
        destination: `${canonical.origin}/:path*`,
        permanent: false,
      }];
    } catch {
      return [];
    }
  },
};

export default nextConfig;
