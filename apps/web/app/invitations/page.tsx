'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Download, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Invitation {
    id: string;
    guestName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    pdfUrl?: string;
}

interface Template {
    id: string;
    name: string;
    front_image_url: string;
}

export default function Invitations() {
    const searchParams = useSearchParams();
    const [guestName, setGuestName] = useState('');
    const [status, setStatus] = useState('');
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [userId, setUserId] = useState('');
    const supabase = createClientComponentClient();

    useEffect(() => {
        initAuth();
    }, []);

    useEffect(() => {
        // Set template from URL query param if available
        const templateIdFromUrl = searchParams.get('templateId');
        if (templateIdFromUrl && !selectedTemplateId) {
            setSelectedTemplateId(templateIdFromUrl);
        }
    }, [searchParams, selectedTemplateId]);

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

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from('templates')
            .select('id, name, front_image_url')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTemplates(data);
            // Auto-select first template if none selected and none from URL
            const templateIdFromUrl = searchParams.get('templateId');
            if (data.length > 0 && !templateIdFromUrl) {
                setSelectedTemplateId(data[0].id);
            }
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplateId) {
            setStatus('Please select a template first.');
            return;
        }
        if (!userId) {
            setStatus('Not authenticated. Please refresh.');
            return;
        }
        setStatus('Generating...');

        const newInvite: Invitation = {
            id: Date.now().toString(),
            guestName,
            status: 'pending'
        };
        setInvitations(prev => [newInvite, ...prev]);

        try {
            const res = await axios.post(`${API_URL}/invitations/send`, {
                user_id: userId,
                template_id: selectedTemplateId,
                guest_name: guestName,
                guest_phone: '0000000000' // placeholder for local dev
            });

            setStatus('Invitation created successfully!');
            setGuestName('');

            // Update invitation with real data from API response
            const apiInvitation = res.data.invitation;
            setInvitations(prev => prev.map(inv =>
                inv.id === newInvite.id
                    ? {
                        ...inv,
                        status: (apiInvitation.status || 'completed') as Invitation['status'],
                        pdfUrl: apiInvitation.pdf_url || undefined,
                    }
                    : inv
            ));
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.message;
            setStatus('Error: ' + msg);
            setInvitations(prev => prev.map(inv =>
                inv.id === newInvite.id ? { ...inv, status: 'failed' as const } : inv
            ));
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-xl font-bold mb-4">Generate Invitation</h2>

                {/* Template Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Select Template</label>
                    {templates.length === 0 ? (
                        <p className="text-sm text-gray-400">No templates found. <a href="/templates/new" className="text-blue-600 underline">Create one first</a>.</p>
                    ) : (
                        <select
                            className="w-full border rounded p-2 text-sm"
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                        >
                            <option value="">-- Select a template --</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <form onSubmit={handleGenerate} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Guest Name</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!selectedTemplateId}
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:bg-gray-400"
                    >
                        Generate PDF
                    </button>
                </form>
                {status && <p className="mt-2 text-sm text-gray-500">{status}</p>}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <h3 className="text-lg font-bold p-6 border-b">Recent Invitations</h3>
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">Guest Name</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-gray-400">No invitations generated yet.</td>
                            </tr>
                        )}
                        {invitations.map((inv) => (
                            <tr key={inv.id} className="border-t">
                                <td className="p-4">{inv.guestName}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold capitalize
                                    ${inv.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            inv.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'}`}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {inv.status === 'completed' && inv.pdfUrl ? (
                                        <a
                                            href={inv.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                        >
                                            <Download size={16} /> Download
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 text-sm">
                                            {inv.status === 'processing' || inv.status === 'pending' ? <Loader2 className="animate-spin" size={16} /> : '-'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
