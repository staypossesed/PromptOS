/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.UMPROMPT_BILLING_TEST === "1" ? ".next-billing-test" : process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
