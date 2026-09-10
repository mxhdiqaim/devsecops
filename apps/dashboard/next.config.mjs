/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/db"],
  experimental: {
    serverComponentsExternalPackages: ["postgres"]
  }
};

export default nextConfig;
