/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@agents-go/db", "@agents-go/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "pump.mypinata.cloud" },
    ],
  },
};

export default nextConfig;
