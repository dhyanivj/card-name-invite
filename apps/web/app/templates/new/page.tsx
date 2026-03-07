'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../../components/AppShell';

export default function NewTemplate() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClientComponentClient();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<any>(null);
    const initRef = useRef(false);
    const [templateName, setTemplateName] = useState('');

    interface TemplatePage {
        id: string;
        file?: File;
        url?: string;
        preview: string;
    }
    const [pages, setPages] = useState<TemplatePage[]>([]);

    const [saving, setSaving] = useState(false);
    const [canvasReady, setCanvasReady] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Track selected object properties for UI controls
    const [selectedProps, setSelectedProps] = useState<{
        fontFamily: string;
        fontSize: number;
        fill: string;
    } | null>(null);

    // Normalize scale: convert scaleX/scaleY into actual fontSize and reset scale to 1
    // This ensures that when user resizes text with mouse handles, the fontSize
    // gets updated to reflect the visual size, and position stays accurate.
    const normalizeObject = useCallback((obj: any) => {
        if (!obj || (obj.type !== 'i-text' && obj.type !== 'textbox')) return;
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        if (scaleX !== 1 || scaleY !== 1) {
            const newFontSize = Math.round(obj.fontSize * scaleY);
            obj.set({
                fontSize: newFontSize,
                scaleX: 1,
                scaleY: 1,
            });
            obj.setCoords(); // recalculate bounding box with new size
        }
    }, []);

    const syncSelectedProps = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active && (active.type === 'i-text' || active.type === 'textbox')) {
            // Normalize first so fontSize reflects visual size
            normalizeObject(active);
            canvas.requestRenderAll();
            setSelectedProps({
                fontFamily: active.fontFamily || 'Arial',
                fontSize: active.fontSize || 30,
                fill: (active.fill as string) || '#000000',
            });
        } else {
            setSelectedProps(null);
        }
    }, [normalizeObject]);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        import('fabric').then((fabricModule) => {
            const container = canvasContainerRef.current;
            if (!container) return;

            const canvasEl = document.createElement('canvas');
            canvasEl.width = 500;
            canvasEl.height = 700;
            container.appendChild(canvasEl);

            const canvas = new fabricModule.fabric.Canvas(canvasEl, {
                width: 500,
                height: 700,
                backgroundColor: '#f0f0f0',
                preserveObjectStacking: true,
                selection: true,
            });

            setTimeout(() => {
                canvas.calcOffset();
            }, 100);

            canvas.on('selection:created', syncSelectedProps);
            canvas.on('selection:updated', syncSelectedProps);
            canvas.on('selection:cleared', () => setSelectedProps(null));

            // On object:modified, normalize scale → fontSize
            canvas.on('object:modified', (e: any) => {
                if (e.target) {
                    normalizeObject(e.target);
                    canvas.requestRenderAll();
                }
                syncSelectedProps();
            });

            fabricCanvasRef.current = canvas;
            setCanvasReady(true);

            // Check if we're editing an existing template
            const templateId = searchParams.get('edit');
            if (templateId) {
                loadTemplate(templateId, fabricModule, canvas);
            }
        });

        return () => {
            const canvas = fabricCanvasRef.current;
            if (canvas) {
                canvas.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [syncSelectedProps, normalizeObject, searchParams]);

    // Load existing template for editing
    const loadTemplate = async (templateId: string, fabricModule: any, canvas: any) => {
        try {
            // Auto sign-in
            let { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                await supabase.auth.signInWithPassword({
                    email: 'test@test.com',
                    password: 'testpassword123',
                });
            }

            const { data: template, error } = await supabase
                .from('templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error || !template) {
                console.error('Failed to load template:', error);
                return;
            }

            setEditingId(template.id);
            setTemplateName(template.name);

            const config = template.config;
            const loadedPages: TemplatePage[] = [];

            if (config?.pages && Array.isArray(config.pages)) {
                config.pages.forEach((pUrl: string, idx: number) => {
                    loadedPages.push({ id: `existing-${idx}`, url: pUrl, preview: pUrl });
                });
            } else if (template.front_image_url) {
                loadedPages.push({ id: 'existing-0', url: template.front_image_url, preview: template.front_image_url });
            }

            setPages(loadedPages);

            // Load background image (first page)
            if (loadedPages.length > 0) {
                fabricModule.fabric.Image.fromURL(loadedPages[0].preview, (img: any) => {
                    img.scaleToWidth(500);
                    canvas.setBackgroundImage(img, () => {
                        canvas.renderAll();
                        canvas.calcOffset();
                    });
                }, { crossOrigin: 'anonymous' });
            }

            // Load text placeholders
            const placeholders = config?.placeholders || [];
            for (const ph of placeholders) {
                const text = new fabricModule.fabric.IText(ph.text || 'Guest Name', {
                    left: ph.left || 150,
                    top: ph.top || 300,
                    fontFamily: ph.fontFamily || 'Arial',
                    fill: ph.fill || '#000000',
                    fontSize: ph.fontSize || 30,
                    padding: 10,
                    cornerSize: 12,
                    transparentCorners: false,
                    borderColor: '#2563eb',
                    cornerColor: '#2563eb',
                    cornerStyle: 'circle' as any,
                    hasControls: true,
                    hasBorders: true,
                    lockScalingFlip: true,
                });
                canvas.add(text);
            }
            canvas.requestRenderAll();
        } catch (err) {
            console.error('Error loading template:', err);
        }
    };

    // Recalculate offset on window resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = fabricCanvasRef.current;
            if (canvas) canvas.calcOffset();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const newPages: TemplatePage[] = [];
        Array.from(fileList).forEach((file) => {
            const preview = URL.createObjectURL(file);
            newPages.push({ id: Math.random().toString(36).substring(7), file, preview });
        });

        setPages(prev => {
            const updated = [...prev, ...newPages];
            // If it's the first image ever, load it onto the canvas
            if (prev.length === 0 && updated.length > 0) {
                const canvas = fabricCanvasRef.current;
                if (canvas) {
                    import('fabric').then((mod) => {
                        mod.fabric.Image.fromURL(updated[0].preview, (img) => {
                            img.scaleToWidth(500);
                            canvas.setBackgroundImage(img, () => {
                                canvas.renderAll();
                                canvas.calcOffset();
                            });
                        });
                    });
                }
            }
            return updated;
        });

        // Clear input value so same files can be uploaded again if needed
        e.target.value = '';
    };

    const updateCanvasBackgroundIfFirstChanged = (prev: TemplatePage[], next: TemplatePage[]) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const prevFirst = prev[0]?.preview;
        const nextFirst = next[0]?.preview;

        if (prevFirst !== nextFirst) {
            if (nextFirst) {
                import('fabric').then((mod) => {
                    mod.fabric.Image.fromURL(nextFirst, (img) => {
                        img.scaleToWidth(500);
                        canvas.setBackgroundImage(img, () => {
                            canvas.renderAll();
                            canvas.calcOffset();
                        });
                    }, next[0].url ? { crossOrigin: 'anonymous' } : undefined);
                });
            } else {
                canvas.setBackgroundImage(null, () => canvas.renderAll());
            }
        }
    };

    const movePageUp = (index: number) => {
        if (index === 0) return;
        setPages(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            updateCanvasBackgroundIfFirstChanged(prev, next);
            return next;
        });
    };

    const movePageDown = (index: number) => {
        setPages(prev => {
            if (index === prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            updateCanvasBackgroundIfFirstChanged(prev, next);
            return next;
        });
    };

    const removePage = (index: number) => {
        setPages(prev => {
            const next = prev.filter((_, i) => i !== index);
            updateCanvasBackgroundIfFirstChanged(prev, next);
            return next;
        });
    };

    const addTextPlaceholder = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        import('fabric').then((mod) => {
            const text = new mod.fabric.IText('Guest Name', {
                left: 150,
                top: 300,
                fontFamily: 'Arial',
                fill: '#000000',
                fontSize: 30,
                padding: 10,
                cornerSize: 12,
                transparentCorners: false,
                borderColor: '#2563eb',
                cornerColor: '#2563eb',
                cornerStyle: 'circle' as any,
                hasControls: true,
                hasBorders: true,
                lockScalingFlip: true,
            });
            canvas.add(text);
            canvas.setActiveObject(text);
            canvas.requestRenderAll();
            syncSelectedProps();
        });
    };

    const updateSelectedProp = (property: string, value: string | number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;

        active.set(property as any, value);
        if (property === 'fontSize') {
            // Reset scale when setting fontSize manually
            active.set({ scaleX: 1, scaleY: 1 });
            active.setCoords();
        }
        canvas.requestRenderAll();

        setSelectedProps((prev) =>
            prev ? { ...prev, [property]: value } : null
        );
    };

    const saveTemplate = async () => {
        const canvas = fabricCanvasRef.current;
        if (!templateName) return alert('Please enter a template name');
        if (pages.length === 0) return alert('Please upload at least one page');
        if (!canvas) return;

        setSaving(true);
        try {
            let { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email: 'test@test.com',
                    password: 'testpassword123',
                });
                if (signInError) {
                    alert('Failed to sign in: ' + signInError.message);
                    setSaving(false);
                    return;
                }
                user = data.user;
            }
            if (!user) {
                alert('Unable to authenticate.');
                setSaving(false);
                return;
            }

            // Process uploads for all pages
            const uploadedPageUrls: string[] = [];
            for (let i = 0; i < pages.length; i++) {
                const p = pages[i];
                if (p.url) {
                    uploadedPageUrls.push(p.url);
                } else if (p.file) {
                    const fileExt = p.file.name.split('.').pop() || 'png';
                    const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `${user.id}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('assets')
                        .upload(filePath, p.file);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage
                        .from('assets')
                        .getPublicUrl(filePath);
                    uploadedPageUrls.push(urlData.publicUrl);
                }
            }

            const frontImageUrl = uploadedPageUrls.length > 0 ? uploadedPageUrls[0] : null;

            // Normalize all text objects before extracting config
            const objects = canvas.getObjects('i-text');
            objects.forEach((obj: any) => normalizeObject(obj));
            canvas.requestRenderAll();

            // Extract config with normalized values
            const placeholders = objects.map((obj: any) => ({
                type: 'text',
                text: obj.text,
                left: Math.round(obj.left),
                top: Math.round(obj.top),
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                fill: obj.fill,
                id: 'guest_name',
            }));

            const configPayload = { placeholders, pages: uploadedPageUrls };

            if (editingId) {
                // Update existing template
                const { error: dbError } = await supabase
                    .from('templates')
                    .update({
                        name: templateName,
                        front_image_url: frontImageUrl,
                        config: configPayload,
                    })
                    .eq('id', editingId);

                if (dbError) throw dbError;
                alert('Template updated successfully!');
            } else {
                // Insert new template
                const { error: dbError } = await supabase.from('templates').insert({
                    user_id: user.id,
                    name: templateName,
                    front_image_url: frontImageUrl,
                    config: configPayload,
                });

                if (dbError) throw dbError;
                alert('Template saved successfully!');
            }

            router.push('/');
        } catch (error: any) {
            console.error('Error saving template:', error);
            alert('Error saving template: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppShell>
            <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
                {/* Left Sidebar */}
                <div className="w-full md:w-1/3 space-y-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="font-bold text-lg mb-4">
                            {editingId ? 'Edit Template' : 'Template Settings'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Template Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="My Wedding Template"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Template Pages
                                </label>
                                <input
                                    type="file"
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    multiple
                                    className="text-sm w-full mb-3"
                                />
                                {pages.length > 0 && (
                                    <div className="space-y-2 border rounded p-3 bg-gray-50 max-h-60 overflow-y-auto">
                                        {pages.map((p, index) => (
                                            <div key={p.id} className="flex items-center gap-3 bg-white p-2 rounded shadow-sm border">
                                                <span className="text-xs font-bold text-gray-400 w-4">{index + 1}</span>
                                                <img src={p.preview} alt={`Page ${index + 1}`} className="w-10 h-14 object-cover rounded bg-gray-100" />
                                                <div className="flex-1"></div>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => movePageUp(index)} disabled={index === 0} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded disabled:opacity-50">↑</button>
                                                    <button onClick={() => movePageDown(index)} disabled={index === pages.length - 1} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded disabled:opacity-50">↓</button>
                                                </div>
                                                <button onClick={() => removePage(index)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="font-bold text-lg mb-4">Text Controls</h3>
                        <button
                            onClick={addTextPlaceholder}
                            className="bg-gray-100 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200 w-full text-sm font-semibold mb-4"
                        >
                            + Add Guest Name Placeholder
                        </button>

                        {selectedProps ? (
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Selected Text Style
                                </h4>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Font Family</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={selectedProps.fontFamily}
                                        onChange={(e) => updateSelectedProp('fontFamily', e.target.value)}
                                    >
                                        <option value="Arial">Arial</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="cursive">Cursive</option>
                                        <option value="Impact">Impact</option>
                                        <option value="Comic Sans MS">Comic Sans MS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Font Size</label>
                                    <input
                                        type="number"
                                        min={8}
                                        max={200}
                                        className="w-full border rounded p-2 text-sm"
                                        value={selectedProps.fontSize}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val > 0) {
                                                updateSelectedProp('fontSize', val);
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Text Color</label>
                                    <input
                                        type="color"
                                        className="w-full h-10 border rounded cursor-pointer"
                                        value={selectedProps.fill}
                                        onChange={(e) => updateSelectedProp('fill', e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 pt-4 border-t text-center">
                                Click a text on the canvas to edit its style.
                            </p>
                        )}
                    </div>

                    <button
                        onClick={saveTemplate}
                        disabled={saving}
                        className="bg-black text-white w-full py-4 rounded-lg font-bold hover:bg-gray-800 transition disabled:bg-gray-400 shadow-md"
                    >
                        {saving ? 'Saving...' : editingId ? 'Update Template' : 'Save Template'}
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-4 uppercase font-bold tracking-widest text-center">
                        Canvas Preview — Click text to select, drag to move
                    </p>
                    <div
                        ref={canvasContainerRef}
                        style={{ width: 500, height: 700 }}
                        className="mx-auto shadow-2xl border"
                    />
                </div>
            </div>
        </AppShell>
    );
}
