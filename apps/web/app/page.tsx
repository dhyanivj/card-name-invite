'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, Lock, Eye, EyeOff, Trash2, Pencil, ArrowRight, Sparkles, LayoutTemplate } from 'lucide-react';
import AppShell from '../components/AppShell';

interface Template {
    id: string;
    name: string;
    front_image_url: string;
    created_at: string;
    config: any;
}

export default function Home() {
    const supabase = createClientComponentClient();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    // Password gate
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const auth = sessionStorage.getItem('app_authenticated');
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
        setCheckingAuth(false);
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTemplates();
        }
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (data.success) {
                sessionStorage.setItem('app_authenticated', 'true');
                setIsAuthenticated(true);
            } else {
                setAuthError('Incorrect password. Please try again.');
            }
        } catch {
            setAuthError('Something went wrong. Please try again.');
        } finally {
            setAuthLoading(false);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                await supabase.auth.signInWithPassword({
                    email: 'test@test.com',
                    password: 'testpassword123',
                });
            }

            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteTemplate = async (id: string) => {
        if (!confirm('Delete this template? This cannot be undone.')) return;
        const { error } = await supabase.from('templates').delete().eq('id', id);
        if (!error) {
            setTemplates((prev) => prev.filter((t) => t.id !== id));
        }
    };

    // Loading check
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950">
                <Loader2 className="animate-spin text-white/40" size={32} />
            </div>
        );
    }

    // ── LOGIN SCREEN ─────────────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center login-bg">
                {/* Floating decorative elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[15%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-[15%] right-[10%] w-96 h-96 bg-rose-500/8 rounded-full blur-3xl" />
                    <div className="absolute top-[40%] right-[25%] w-48 h-48 bg-violet-400/10 rounded-full blur-2xl" />
                </div>

                <div className="relative z-10 w-full max-w-sm mx-4">
                    {/* Logo & Title */}
                    <div className="text-center mb-10 animate-fadeIn">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-900/30">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                            WeddingInviter
                        </h1>
                        <p className="text-purple-200/70 text-sm">
                            Enter your password to access the dashboard
                        </p>
                    </div>

                    {/* Login Form */}
                    <form
                        onSubmit={handleLogin}
                        className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-8 shadow-2xl shadow-black/20 animate-slideUp"
                        style={{ animationDelay: '0.12s' }}
                    >
                        <div className="mb-7">
                            <label className="block text-sm font-semibold text-white/80 mb-2.5 flex items-center gap-1.5">
                                <Lock size={13} />
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all pr-10"
                                    placeholder="Enter access password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {authError && (
                                <p className="mt-3 text-sm text-rose-300 flex items-center gap-1.5 bg-rose-500/10 rounded-lg px-3 py-2 border border-rose-400/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                    {authError}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading || !password}
                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {authLoading ? (
                                <><Loader2 className="animate-spin" size={16} /> Verifying...</>
                            ) : (
                                <>Unlock Dashboard <ArrowRight size={15} /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-purple-300/30 text-xs mt-8">
                        WeddingInviter &copy; 2026
                    </p>
                </div>
            </div>
        );
    }

    // ── DASHBOARD ────────────────────────────────────────────────────────
    return (
        <AppShell>
            <div className="max-w-6xl mx-auto animate-fadeIn">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="glass-card p-8 rounded-2xl hover-lift group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-200/50">
                            <Sparkles className="text-white" size={22} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Create New Template</h2>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Upload your wedding card designs and configure text placement for guest names.
                        </p>
                        <Link href="/templates/new" className="btn-primary inline-flex items-center gap-2">
                            Get Started <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="glass-card p-8 rounded-2xl hover-lift group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mb-5 shadow-lg shadow-rose-200/50">
                            <LayoutTemplate className="text-white" size={22} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Generate Invitations</h2>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Generate personalized invitation PDFs for your guests from saved templates.
                        </p>
                        <Link href="/invitations" className="btn-primary inline-flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)' }}>
                            Go to Invitations <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Saved Templates */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">Saved Templates</h2>
                        <span className="text-xs font-semibold text-violet-500 bg-violet-50 px-3 py-1 rounded-full">
                            {templates.length} template{templates.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-16 text-center">
                            <Loader2 className="animate-spin text-violet-400 mx-auto mb-3" size={28} />
                            <p className="text-gray-400 text-sm">Loading templates...</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                <LayoutTemplate className="text-gray-300" size={28} />
                            </div>
                            <p className="text-gray-400 mb-4 text-sm">No templates saved yet.</p>
                            <Link href="/templates/new" className="btn-primary inline-flex items-center gap-2">
                                Create your first template <ArrowRight size={14} />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {templates.map((template, index) => (
                                <div key={template.id}
                                    className="bg-white rounded-xl overflow-hidden border border-gray-100 hover-lift group animate-slideUp"
                                    style={{ animationDelay: `${index * 0.05}s` }}>
                                    <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden relative">
                                        <img
                                            src={template.front_image_url}
                                            alt={template.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-800 mb-1">{template.name}</h3>
                                        <p className="text-xs text-gray-400 mb-4">
                                            Created {new Date(template.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/invitations?templateId=${template.id}`}
                                                className="btn-primary flex-1 text-center text-xs py-2"
                                            >
                                                Use Template
                                            </Link>
                                            <Link
                                                href={`/templates/new?edit=${template.id}`}
                                                className="btn-secondary px-3 py-2 text-xs"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </Link>
                                            <button
                                                onClick={() => deleteTemplate(template.id)}
                                                className="btn-danger px-3 py-2 text-xs"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
