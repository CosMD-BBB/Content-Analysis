/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp", "pg-boss", "postgres", "bcryptjs"],
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
