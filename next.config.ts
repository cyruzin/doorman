import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CSP/HSTS de fora por ora: CSP exige nonce pro script inline; HSTS quebraria HTTP local.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
