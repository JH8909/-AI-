/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  transpilePackages: ['@ecommerce/shared-types', '@ecommerce/llm-adapter'],
}

module.exports = nextConfig
