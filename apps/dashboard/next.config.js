/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporariamente desabilitado para evitar problemas
  swcMinify: true,
  images: {
    unoptimized: true, // Para desenvolvimento local
  },
  // Desabilitar verificação TypeScript durante desenvolvimento
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
