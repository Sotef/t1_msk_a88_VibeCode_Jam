/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack конфигурация (Next.js 16 использует Turbopack по умолчанию)
  turbopack: {},
}

export default nextConfig
