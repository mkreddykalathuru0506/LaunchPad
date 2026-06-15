/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  experimental: {
    // Selfie liveness videos (VIDEO stage) upload through a server action, which
    // buffers the whole body. The video page advertises up to 200 MB, so this must
    // match — at 20 MB a normal phone recording was silently rejected before the
    // action ran. NOTE: the reverse proxy in front (Caddyfile / shared Caddy) must
    // allow the same size, and each in-flight upload holds up to this much in the
    // web container's memory.
    serverActions: { bodySizeLimit: "200mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
