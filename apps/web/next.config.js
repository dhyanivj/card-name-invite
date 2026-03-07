/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@pdf-lib/fontkit', 'regenerator-runtime'],
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
