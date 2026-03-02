import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Wedding Card Auto Personalizer',
    description: 'Send personalized wedding invitations via WhatsApp',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="min-h-screen bg-gray-50 flex flex-col">
                    <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-800">WeddingInviter</h1>
                        <nav className="space-x-4">
                            <Link href="/" className="text-gray-600 hover:text-black">Dashboard</Link>
                            <Link href="/templates/new" className="text-gray-600 hover:text-black">New Template</Link>
                            <Link href="/invitations" className="text-gray-600 hover:text-black">Invitations</Link>
                        </nav>
                    </header>
                    <main className="flex-1 container mx-auto p-6">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
