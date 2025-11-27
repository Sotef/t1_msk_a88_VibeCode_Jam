/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor работает только на клиенте
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      }
    }
    return config
  },
}

export default nextConfig
