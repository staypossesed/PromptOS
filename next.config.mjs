/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async redirects() {
    return [
      { source: "/settings", destination: "/account", permanent: true },
      { source: "/demo", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
