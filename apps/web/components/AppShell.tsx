'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Dashboard' },
        { href: '/templates/new', label: 'New Template' },
        { href: '/invitations', label: 'Invitations' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-rose-50/20 flex flex-col">
            <header className="glass-card sticky top-0 z-50 px-6 py-3.5 flex justify-between items-center shadow-sm border-b border-white/40">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-200/50 group-hover:shadow-purple-300/60 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent">
                        WeddingInviter
                    </span>
                </Link>
                <nav className="flex items-center gap-1">
                    {navItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'text-violet-700 bg-violet-50 font-semibold'
                                    : 'text-gray-500 hover:text-violet-700 hover:bg-violet-50/50'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>
            <main className="flex-1 container mx-auto p-6 max-w-7xl">
                {children}
            </main>
            <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
                WeddingInviter &copy; 2026
            </footer>
        </div>
    );
}
