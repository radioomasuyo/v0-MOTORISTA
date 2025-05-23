/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remover qualquer referência a variáveis de ambiente
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
