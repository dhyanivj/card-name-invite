'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            // Auto sign-in for local dev
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
        if (!confirm('Delete this template?')) return;
        const { error } = await supabase.from('templates').delete().eq('id', id);
        if (!error) {
            setTemplates((prev) => prev.filter((t) => t.id !== id));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-white p-8 rounded-lg shadow-sm border hover:shadow-md transition">
                    <h2 className="text-2xl font-semibold mb-4">Create New Template</h2>
                    <p className="text-gray-600 mb-6">Upload your wedding card designs and configure text placement.</p>
                    <Link href="/templates/new" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
                        Get Started &rarr;
                    </Link>
                </div>

                <div className="bg-white p-8 rounded-lg shadow-sm border hover:shadow-md transition">
                    <h2 className="text-2xl font-semibold mb-4">Generate Invitations</h2>
                    <p className="text-gray-600 mb-6">Generate personalized invitation PDFs for your guests.</p>
                    <Link href="/invitations" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Go to Invitations &rarr;
                    </Link>
                </div>
            </div>

            {/* Saved Templates */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold">Saved Templates</h2>
                    <span className="text-sm text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading templates...</div>
                ) : templates.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-400 mb-4">No templates saved yet.</p>
                        <Link href="/templates/new" className="text-blue-600 hover:underline font-medium">
                            Create your first template &rarr;
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {templates.map((template) => (
                            <div key={template.id} className="border rounded-lg overflow-hidden hover:shadow-md transition group">
                                <div className="h-48 bg-gray-100 overflow-hidden">
                                    <img
                                        src={template.front_image_url}
                                        alt={template.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                                    <p className="text-xs text-gray-400 mb-3">
                                        Created {new Date(template.created_at).toLocaleDateString()}
                                    </p>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/invitations?templateId=${template.id}`}
                                            className="flex-1 bg-black text-white text-center text-sm py-2 rounded hover:bg-gray-800 transition"
                                        >
                                            Use Template
                                        </Link>
                                        <Link
                                            href={`/templates/new?edit=${template.id}`}
                                            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => deleteTemplate(template.id)}
                                            className="px-3 py-2 text-sm border border-red-200 text-red-500 rounded hover:bg-red-50 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
