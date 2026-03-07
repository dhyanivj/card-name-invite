/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@pdf-lib/fontkit', 'regenerator-runtime', 'sharp', 'pdf-lib', 'fabric'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
        ],
    },
}

module.exports = nextConfig
