import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const templateId = searchParams.get('template_id');

        let query = supabaseAdmin
            .from('invitations')
            .select(`
                id,
                status,
                pdf_url,
                created_at,
                template_id,
                guests!inner(name, phone)
            `)
            .order('created_at', { ascending: false });

        // Filter by template_id if provided
        if (templateId) {
            query = query.eq('template_id', templateId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
