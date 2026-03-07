'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Download, Loader2, FileText, UserPlus, RefreshCw, Trash2, ChevronDown, Search, ArrowRight } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '../../components/AppShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface Invitation {
    id: string;
    guestName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    pdfUrl?: string;
    templateId?: string;
}

interface Template {
    id: string;
    name: string;
    front_image_url: string;
}

export default function Invitations() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [guestName, setGuestName] = useState('');
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [userId, setUserId] = useState('');
    const [loadingInvitations, setLoadingInvitations] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const supabase = createClientComponentClient();

    // Check auth
    useEffect(() => {
        const auth = sessionStorage.getItem('app_authenticated');
        if (auth === 'true') {
            setIsAuthenticated(true);
        } else {
            router.push('/');
        }
        setCheckingAuth(false);
    }, [router]);

    useEffect(() => {
        if (isAuthenticated) {
            initAuth();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // Set template from URL query param if available
        const templateIdFromUrl = searchParams.get('templateId');
        if (templateIdFromUrl && !selectedTemplateId) {
            setSelectedTemplateId(templateIdFromUrl);
        }
    }, [searchParams, selectedTemplateId]);

    // Fetch invitations when template changes
    useEffect(() => {
        if (selectedTemplateId && userId) {
            fetchInvitations(selectedTemplateId);
        }
    }, [selectedTemplateId, userId]);

    const initAuth = async () => {
        try {
            let { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: 'test@test.com',
                    password: 'testpassword123',
                });
                if (error) {
                    console.error('Auth error:', error);
                    return;
                }
                user = data.user;
            }
            if (user) {
                setUserId(user.id);
                fetchTemplates();
            }
        } catch (err) {
            console.error('Auth init error:', err);
        }
    };

    const fetchInvitations = useCallback(async (templateId?: string) => {
        setLoadingInvitations(true);
        try {
            const tId = templateId || selectedTemplateId;
            const url = tId
                ? `${API_URL}/invitations?template_id=${tId}`
                : `${API_URL}/invitations`;
            const res = await axios.get(url);
            const loaded = res.data.map((inv: any) => ({
                id: inv.id,
                guestName: inv.guests?.name || 'Unknown',
                // Normalize stale 'processing' status to 'pending' — 
                // processing is only set client-side when user clicks "Generate PDF"
                status: inv.status === 'processing' ? 'pending' : inv.status,
                pdfUrl: inv.pdf_url || undefined,
                templateId: inv.template_id,
            }));
            setInvitations(loaded);
        } catch (err) {
            console.error('Failed to fetch invitations:', err);
        } finally {
            setLoadingInvitations(false);
        }
    }, [selectedTemplateId]);

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from('templates')
            .select('id, name, front_image_url')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTemplates(data);
            const templateIdFromUrl = searchParams.get('templateId');
            if (data.length > 0 && !templateIdFromUrl) {
                setSelectedTemplateId(data[0].id);
            }
        }
    };

    const handleTemplateChange = (newTemplateId: string) => {
        setSelectedTemplateId(newTemplateId);
        setInvitations([]);
        setSearchQuery('');
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplateId) {
            setStatus('Please select a template first.');
            setStatusType('error');
            return;
        }
        if (!userId) {
            setStatus('Not authenticated. Please refresh.');
            setStatusType('error');
            return;
        }
        setStatus('Adding guest...');
        setStatusType('');

        const newInvite: Invitation = {
            id: Date.now().toString(),
            guestName,
            status: 'pending',
            templateId: selectedTemplateId,
        };
        setInvitations(prev => [newInvite, ...prev]);

        try {
            const res = await axios.post(`${API_URL}/invitations/send`, {
                user_id: userId,
                template_id: selectedTemplateId,
                guest_name: guestName,
                guest_phone: '0000000000'
            });

            setStatus('Guest added! You can generate PDF when ready.');
            setStatusType('success');
            setGuestName('');

            const apiInvitation = res.data.invitation;
            setInvitations(prev => prev.map(inv =>
                inv.id === newInvite.id
                    ? {
                        ...inv,
                        id: apiInvitation.id,
                        status: (apiInvitation.status || 'pending') as Invitation['status'],
                        pdfUrl: apiInvitation.pdf_url || undefined,
                    }
                    : inv
            ));

            // Clear status after 3 seconds
            setTimeout(() => { setStatus(''); setStatusType(''); }, 3000);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.message;
            setStatus('Error: ' + msg);
            setStatusType('error');
            setInvitations(prev => prev.map(inv =>
                inv.id === newInvite.id ? { ...inv, status: 'failed' as const } : inv
            ));
        }
    };

    const handleGeneratePdf = async (id: string) => {
        setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'processing' } : inv));
        try {
            const res = await axios.post(`${API_URL}/invitations/${id}/generate`);
            setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'completed', pdfUrl: res.data.url } : inv));
        } catch (err: any) {
            console.error('Failed to generate PDF:', err);
            setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'failed' } : inv));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this invitation?')) return;
        try {
            await axios.delete(`${API_URL}/invitations/${id}`);
            setInvitations(prev => prev.filter(inv => inv.id !== id));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    // Filter invitations by search query
    const filteredInvitations = invitations.filter(inv =>
        inv.guestName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = invitations.filter(i => i.status === 'pending').length;
    const completedCount = invitations.filter(i => i.status === 'completed').length;

    if (checkingAuth || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-violet-500" size={32} />
            </div>
        );
    }

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Invitations</h1>
                        <p className="text-sm text-gray-400 mt-1">Add guests and generate personalized PDFs</p>
                    </div>
                    <Link href="/" className="btn-secondary text-xs flex items-center gap-1.5">
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Generate form */}
                <div className="glass-card p-6 rounded-2xl mb-8 animate-slideUp">
                    <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <UserPlus size={20} className="text-violet-500" />
                        Add Guest
                    </h2>

                    {/* Template Selection */}
                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-gray-600 mb-2">Select Template</label>
                        {templates.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-center gap-2">
                                <span>⚠️</span>
                                No templates found.
                                <Link href="/templates/new" className="underline font-semibold hover:no-underline">
                                    Create one first
                                </Link>
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    className="input-field appearance-none pr-10 font-medium"
                                    value={selectedTemplateId}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                >
                                    <option value="">-- Select a template --</option>
                                    {templates.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        )}
                    </div>

                    {/* Selected template preview */}
                    {selectedTemplate && (
                        <div className="flex items-center gap-3 mb-5 p-3 bg-violet-50/50 rounded-xl border border-violet-100">
                            <img
                                src={selectedTemplate.front_image_url}
                                alt={selectedTemplate.name}
                                className="w-12 h-16 object-cover rounded-lg shadow-sm"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">{selectedTemplate.name}</p>
                                <p className="text-xs text-gray-400">Selected template</p>
                            </div>
                            <div className="flex gap-3 text-xs">
                                <span className="bg-white px-3 py-1 rounded-full text-violet-600 font-semibold border border-violet-100">
                                    {completedCount} generated
                                </span>
                                {pendingCount > 0 && (
                                    <span className="bg-white px-3 py-1 rounded-full text-amber-600 font-semibold border border-amber-100">
                                        {pendingCount} pending
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleGenerate} className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-600 mb-2">Guest Name</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Shri Ram & Family"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!selectedTemplateId || !guestName.trim()}
                            className="btn-primary flex items-center gap-2 py-2.5 whitespace-nowrap"
                        >
                            <UserPlus size={16} /> Add Guest
                        </button>
                    </form>

                    {status && (
                        <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fadeIn ${statusType === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : statusType === 'error'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}>
                            {statusType === 'success' && <span>✓</span>}
                            {statusType === 'error' && <span>✕</span>}
                            {!statusType && <Loader2 className="animate-spin" size={14} />}
                            {status}
                        </div>
                    )}
                </div>

                {/* Invitations List */}
                <div className="glass-card rounded-2xl overflow-hidden animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-gray-100 gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={18} className="text-violet-500" />
                                Guest List
                                {selectedTemplate && (
                                    <span className="text-xs font-normal text-gray-400 ml-1">
                                        for &quot;{selectedTemplate.name}&quot;
                                    </span>
                                )}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {invitations.length > 0 && (
                                <div className="relative flex-1 sm:flex-initial">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                    <input
                                        type="text"
                                        className="input-field pl-8 py-1.5 text-xs w-full sm:w-48"
                                        placeholder="Search guests..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => fetchInvitations()}
                                className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {!selectedTemplateId ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-gray-300" size={28} />
                            </div>
                            <p className="text-gray-400 text-sm mb-1">Select a template to view guests</p>
                            <p className="text-gray-300 text-xs">Choose a template from the dropdown above</p>
                        </div>
                    ) : loadingInvitations ? (
                        <div className="p-16 text-center">
                            <Loader2 className="animate-spin text-violet-400 mx-auto mb-3" size={24} />
                            <p className="text-gray-400 text-sm">Loading guests...</p>
                        </div>
                    ) : filteredInvitations.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                <UserPlus className="text-gray-300" size={28} />
                            </div>
                            <p className="text-gray-400 text-sm mb-1">
                                {searchQuery ? 'No guests matching your search' : 'No guests added yet'}
                            </p>
                            {!searchQuery && (
                                <p className="text-gray-300 text-xs">Add a guest name above to get started</p>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredInvitations.map((inv, index) => (
                                <div
                                    key={inv.id}
                                    className="flex items-center gap-4 p-4 hover:bg-violet-50/30 transition group animate-fadeIn"
                                    style={{ animationDelay: `${index * 0.03}s` }}
                                >
                                    {/* Guest avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-bold text-violet-600">
                                            {inv.guestName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Guest name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{inv.guestName}</p>
                                    </div>

                                    {/* Status badge */}
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize shrink-0
                                    ${inv.status === 'completed' ? 'badge-completed' :
                                            inv.status === 'failed' ? 'badge-failed' :
                                                inv.status === 'processing' ? 'badge-processing' :
                                                    'badge-pending'}`}>
                                        {inv.status === 'processing' && <Loader2 className="animate-spin mr-1" size={10} />}
                                        {inv.status}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {inv.status === 'completed' && inv.pdfUrl ? (
                                            <a
                                                href={inv.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition"
                                            >
                                                <Download size={13} /> Download
                                            </a>
                                        ) : inv.status === 'processing' ? (
                                            <span className="text-gray-400 text-xs flex items-center gap-1.5 px-3 py-1.5">
                                                <Loader2 className="animate-spin" size={13} /> Generating...
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleGeneratePdf(inv.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-100 transition"
                                            >
                                                <FileText size={13} /> Generate PDF
                                            </button>
                                        )}

                                        {!(inv.status === 'processing') && (
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer summary */}
                    {filteredInvitations.length > 0 && (
                        <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between text-xs text-gray-400">
                            <span>{filteredInvitations.length} guest{filteredInvitations.length !== 1 ? 's' : ''}</span>
                            <span>{completedCount} PDF{completedCount !== 1 ? 's' : ''} generated</span>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
